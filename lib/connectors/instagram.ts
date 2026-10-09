import { query } from "../db";
import { decrypt, encrypt } from "../crypto";
import { fetchJson, saveChannelDay, saveVideo, today } from "./common";

// Instagram professional accounts via Facebook Login and the Graph API.
// Needs a Meta app with these permissions approved in App Review for clients
// outside your own team.
const VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const GRAPH = process.env.META_GRAPH_BASE || `https://graph.facebook.com/${VERSION}`;
// instagram_content_publish posts approved Reels; the rest read statistics.
const SCOPES = ["instagram_basic", "instagram_manage_insights", "instagram_content_publish", "pages_show_list", "pages_read_engagement", "business_management"];

export const metaConfigured = () => Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);

export function metaAuthUrl(redirectUri: string, state: string) {
  const p = new URLSearchParams({ client_id: process.env.META_APP_ID!, redirect_uri: redirectUri, state, scope: SCOPES.join(","), response_type: "code" });
  return `https://www.facebook.com/${VERSION}/dialog/oauth?${p}`;
}

type Page = { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } };

export async function connectInstagram(clientId: number, code: string, redirectUri: string) {
  const app = { client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET! };
  const short = await fetchJson<{ access_token: string }>(`${GRAPH}/oauth/access_token?${new URLSearchParams({ ...app, redirect_uri: redirectUri, code })}`);
  const long = await fetchJson<{ access_token: string }>(
    `${GRAPH}/oauth/access_token?${new URLSearchParams({ ...app, grant_type: "fb_exchange_token", fb_exchange_token: short.access_token })}`,
  );
  // Page tokens obtained from a long-lived user token do not expire.
  const { data = [] } = await fetchJson<{ data?: Page[] }>(
    `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${long.access_token}`,
  );
  const linked = data.filter((p) => p.instagram_business_account);
  // People can untick permissions in Facebook's dialog, so record whether posting was allowed.
  const perms = await fetchJson<{ data?: { permission: string; status: string }[] }>(`${GRAPH}/me/permissions?access_token=${long.access_token}`).catch(() => ({ data: [] }));
  const canPublish = (perms.data ?? []).some((p) => p.permission === "instagram_content_publish" && p.status === "granted");
  if (!linked.length) throw new Error("No Instagram professional account is linked to a Facebook Page you manage.");
  for (const p of linked) {
    const ig = p.instagram_business_account!;
    await query(
      `INSERT INTO connections (client_id, platform, account_id, account_name, access_token, status, last_error, can_publish)
       VALUES ($1, 'instagram', $2, $3, $4, 'active', NULL, $5)
       ON CONFLICT (client_id, platform, account_id) DO UPDATE SET account_name = EXCLUDED.account_name,
         access_token = EXCLUDED.access_token, status = 'active', last_error = NULL, can_publish = EXCLUDED.can_publish`,
      [clientId, ig.id, ig.username ? `@${ig.username}` : p.name, encrypt(p.access_token), canPublish],
    );
  }
  return linked.map((p) => p.instagram_business_account!.username ?? p.name).join(", ");
}

type Media = { id: string; caption?: string; media_type: string; media_product_type?: string; permalink?: string; timestamp: string; like_count?: number; comments_count?: number };

export async function syncInstagram(conn: { client_id: number; account_id: string; access_token: string }) {
  const token = decrypt(conn.access_token);
  const acct = await fetchJson<{ followers_count?: number }>(`${GRAPH}/${conn.account_id}?fields=followers_count,username&access_token=${token}`);
  const media: Media[] = [];
  let next: string | undefined = `${GRAPH}/${conn.account_id}/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count&limit=50&access_token=${token}`;
  while (next && media.length < 200) {
    const page: { data?: Media[]; paging?: { next?: string } } = await fetchJson(next);
    media.push(...(page.data ?? []));
    next = page.paging?.next;
  }
  const day = today();
  let saved = 0;
  for (const m of media) {
    if (m.media_type !== "VIDEO" && m.media_product_type !== "REELS") continue;
    const stats = { views: 0, likes: m.like_count ?? 0, comments: m.comments_count ?? 0, shares: 0, saves: 0 };
    try {
      const ins = await fetchJson<{ data?: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] }>(
        `${GRAPH}/${m.id}/insights?metric=views,saved,shares&access_token=${token}`,
      );
      for (const d of ins.data ?? []) {
        const val = d.total_value?.value ?? d.values?.[0]?.value ?? 0;
        if (d.name === "views") stats.views = val;
        if (d.name === "saved") stats.saves = val;
        if (d.name === "shares") stats.shares = val;
      }
    } catch {
      // Insights are unavailable for some media (e.g. very old posts); keep counts we have.
    }
    await saveVideo(conn.client_id, {
      platform: "instagram",
      externalId: m.id,
      title: (m.caption ?? "Reel").split("\n")[0].slice(0, 120),
      language: null,
      format: "short",
      url: m.permalink ?? null,
      publishedAt: m.timestamp,
      stats,
    }, day);
    saved++;
  }
  await saveChannelDay(conn.client_id, "instagram", day, { followers: acct.followers_count ?? 0 });
  return saved;
}

// Posts one Reel: Instagram downloads the video from a public link (a short-lived signed link is enough),
// processes it, then we publish it. Processing usually takes under a minute; we wait up to `waitMs`.
export async function publishReel(
  conn: { account_id: string; access_token: string },
  videoUrl: string,
  caption: string,
  opts: { waitMs?: number; pollMs?: number } = {},
): Promise<{ id: string; url: string | null }> {
  const token = decrypt(conn.access_token);
  const form = (p: Record<string, string>) => ({ method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ...p, access_token: token }) });
  const container = await fetchJson<{ id: string }>(`${GRAPH}/${conn.account_id}/media`, form({ media_type: "REELS", video_url: videoUrl, caption: caption.slice(0, 2200), share_to_feed: "true" }));
  const deadline = Date.now() + (opts.waitMs ?? 240_000);
  for (;;) {
    const s = await fetchJson<{ status_code?: string; status?: string }>(`${GRAPH}/${container.id}?fields=status_code,status&access_token=${token}`);
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Instagram couldn't process the video: ${s.status ?? s.status_code}`);
    if (Date.now() > deadline) throw new Error("Instagram is still processing the video. Try publishing again in a few minutes.");
    await new Promise((r) => setTimeout(r, opts.pollMs ?? 5000));
  }
  const post = await fetchJson<{ id: string }>(`${GRAPH}/${conn.account_id}/media_publish`, form({ creation_id: container.id }));
  const info = await fetchJson<{ permalink?: string }>(`${GRAPH}/${post.id}?fields=permalink&access_token=${token}`).catch(() => ({ permalink: undefined }));
  return { id: post.id, url: info.permalink ?? null };
}
