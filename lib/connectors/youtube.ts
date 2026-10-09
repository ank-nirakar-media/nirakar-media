import { query } from "../db";
import { decrypt, encrypt } from "../crypto";
import { fetchJson, languageName, saveChannelDay, saveVideo, today } from "./common";

// Google OAuth + YouTube Data API v3 + YouTube Analytics API v2.
// youtube.upload posts approved videos; the other two read statistics.
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];
const UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const API = process.env.YOUTUBE_API_BASE || "https://www.googleapis.com/youtube/v3";
const ANALYTICS = process.env.YOUTUBE_ANALYTICS_BASE || "https://youtubeanalytics.googleapis.com/v2";
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";
const UPLOAD = process.env.YOUTUBE_UPLOAD_BASE || "https://www.googleapis.com/upload/youtube/v3";

export const youtubeConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function youtubeAuthUrl(redirectUri: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

type Token = { access_token: string; refresh_token?: string; expires_in: number; scope?: string };

async function tokenRequest(params: Record<string, string>) {
  return fetchJson<Token>(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...params }),
  });
}

type Channel = { id: string; snippet: { title: string }; statistics: { subscriberCount?: string }; contentDetails: { relatedPlaylists: { uploads: string } } };

export async function connectYoutube(clientId: number, code: string, redirectUri: string) {
  const tok = await tokenRequest({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  const auth = { Authorization: `Bearer ${tok.access_token}` };
  const { items = [] } = await fetchJson<{ items?: Channel[] }>(`${API}/channels?part=snippet,statistics,contentDetails&mine=true`, { headers: auth });
  if (!items.length) throw new Error("This Google account has no YouTube channel.");
  const ch = items[0];
  await query(
    `INSERT INTO connections (client_id, platform, account_id, account_name, access_token, refresh_token, token_expires_at, status, last_error, can_publish)
     VALUES ($1, 'youtube', $2, $3, $4, $5, $6, 'active', NULL, $7)
     ON CONFLICT (client_id, platform, account_id) DO UPDATE SET account_name = EXCLUDED.account_name,
       access_token = EXCLUDED.access_token, refresh_token = COALESCE(EXCLUDED.refresh_token, connections.refresh_token),
       token_expires_at = EXCLUDED.token_expires_at, status = 'active', last_error = NULL, can_publish = EXCLUDED.can_publish`,
    [clientId, ch.id, ch.snippet.title, encrypt(tok.access_token), tok.refresh_token ? encrypt(tok.refresh_token) : null, new Date(Date.now() + tok.expires_in * 1000),
      (tok.scope ?? "").split(" ").includes(UPLOAD_SCOPE)],
  );
  return ch.snippet.title;
}

export type YoutubeConn = { id: number; client_id: number; account_id: string; access_token: string; refresh_token: string | null; token_expires_at: string | null };
type Conn = YoutubeConn;

async function accessToken(conn: Conn) {
  if (conn.token_expires_at && new Date(conn.token_expires_at).getTime() > Date.now() + 60_000) return decrypt(conn.access_token);
  if (!conn.refresh_token) throw new Error("Access expired. Reconnect YouTube.");
  const tok = await tokenRequest({ refresh_token: decrypt(conn.refresh_token), grant_type: "refresh_token" });
  await query("UPDATE connections SET access_token = $1, token_expires_at = $2 WHERE id = $3", [
    encrypt(tok.access_token), new Date(Date.now() + tok.expires_in * 1000), conn.id,
  ]);
  return tok.access_token;
}

// ISO 8601 duration (PT1M5S) to seconds.
function seconds(d: string) {
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : 0;
}

type VideoItem = {
  id: string;
  snippet: { title: string; publishedAt: string; defaultAudioLanguage?: string; defaultLanguage?: string };
  statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails: { duration: string };
};

export async function syncYoutube(conn: Conn) {
  const token = await accessToken(conn);
  const auth = { Authorization: `Bearer ${token}` };
  const { items = [] } = await fetchJson<{ items?: Channel[] }>(`${API}/channels?part=statistics,contentDetails&id=${conn.account_id}`, { headers: auth });
  const ch = items[0];
  if (!ch) throw new Error("Channel not found");

  // Recent uploads (up to 200).
  const ids: string[] = [];
  let page = "";
  do {
    const r = await fetchJson<{ items?: { contentDetails: { videoId: string } }[]; nextPageToken?: string }>(
      `${API}/playlistItems?part=contentDetails&maxResults=50&playlistId=${ch.contentDetails.relatedPlaylists.uploads}${page ? `&pageToken=${page}` : ""}`,
      { headers: auth },
    );
    ids.push(...(r.items ?? []).map((i) => i.contentDetails.videoId));
    page = r.nextPageToken ?? "";
  } while (page && ids.length < 200);

  const day = today();
  for (let i = 0; i < ids.length; i += 50) {
    const r = await fetchJson<{ items?: VideoItem[] }>(`${API}/videos?part=snippet,statistics,contentDetails&id=${ids.slice(i, i + 50).join(",")}`, { headers: auth });
    for (const v of r.items ?? []) {
      const short = seconds(v.contentDetails.duration) <= 180;
      await saveVideo(conn.client_id, {
        platform: "youtube",
        externalId: v.id,
        title: v.snippet.title,
        language: languageName(v.snippet.defaultAudioLanguage || v.snippet.defaultLanguage),
        format: short ? "short" : "long-form",
        url: short ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`,
        publishedAt: v.snippet.publishedAt,
        stats: {
          views: Number(v.statistics.viewCount ?? 0),
          likes: Number(v.statistics.likeCount ?? 0),
          comments: Number(v.statistics.commentCount ?? 0),
          shares: 0,
          saves: 0,
        },
      }, day);
    }
  }
  await saveChannelDay(conn.client_id, "youtube", day, { followers: Number(ch.statistics.subscriberCount ?? 0) });

  // Views from YouTube search, last 30 days (Analytics data lags ~2 days).
  const end = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const start = new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 10);
  const report = await fetchJson<{ rows?: [string, number][] }>(
    `${ANALYTICS}/reports?ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=views&dimensions=day&filters=insightTrafficSourceType==YT_SEARCH`,
    { headers: auth },
  );
  for (const [d, views] of report.rows ?? []) {
    await saveChannelDay(conn.client_id, "youtube", d, { searchViews: Number(views) });
  }
  return ids.length;
}

// YouTube rejects titles over 100 characters or containing < or >.
export const youtubeTitle = (t: string) => t.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 100) || "Untitled";

// Uploads one MP4 with YouTube's resumable upload (start a session, then send the bytes). Vertical videos
// up to 3 minutes become Shorts on their own. Each upload uses 1 of the 100 daily uploads.
export async function uploadYoutube(
  conn: Conn,
  file: Uint8Array<ArrayBuffer>,
  meta: { title: string; description: string; privacy?: "public" | "unlisted" | "private"; short: boolean },
): Promise<{ id: string; url: string }> {
  const token = await accessToken(conn);
  const start = await fetch(`${UPLOAD}/videos?uploadType=resumable&part=snippet,status`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(file.length),
    },
    body: JSON.stringify({
      snippet: { title: youtubeTitle(meta.title), description: meta.description.replace(/[<>]/g, "").slice(0, 5000), categoryId: "22" },
      status: { privacyStatus: meta.privacy ?? "public", selfDeclaredMadeForKids: false },
    }),
  });
  if (!start.ok) {
    const body = await start.text();
    if (start.status === 403 && /insufficient/i.test(body)) throw new Error("This YouTube connection can't upload. Reconnect YouTube and allow uploads.");
    throw new Error(`${start.status} from YouTube: ${body.slice(0, 300)}`);
  }
  const session = start.headers.get("location");
  if (!session) throw new Error("YouTube didn't return an upload address.");
  const video = await fetchJson<{ id: string }>(session, { method: "PUT", headers: { "Content-Type": "video/mp4" }, body: file });
  return { id: video.id, url: meta.short ? `https://www.youtube.com/shorts/${video.id}` : `https://www.youtube.com/watch?v=${video.id}` };
}
