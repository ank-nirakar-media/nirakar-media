import { query } from "../db";

// The daily sync runs early morning IST, so its cumulative numbers describe the
// day that just ended. Snapshots are stored against that day (IST).
export const today = () => new Date(Date.now() + 5.5 * 36e5 - 864e5).toISOString().slice(0, 10);

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}: ${JSON.stringify(data).slice(0, 300)}`);
  return data as T;
}

export type VideoInput = {
  platform: string;
  externalId: string;
  title: string;
  language: string | null;
  format: "short" | "long-form";
  url: string | null;
  publishedAt: string;
  stats: { views: number; likes: number; comments: number; shares: number; saves: number };
};

// Upsert a video and the day's cumulative snapshot. Topic and language set by the
// team in the admin area are kept (COALESCE with existing values).
export async function saveVideo(clientId: number, v: VideoInput, day = today()) {
  const [row] = await query<{ id: number }>(
    `INSERT INTO videos (client_id, platform, external_id, title, language, format, url, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (client_id, platform, external_id) DO UPDATE
       SET title = EXCLUDED.title, url = EXCLUDED.url, format = EXCLUDED.format,
           language = COALESCE(videos.language, EXCLUDED.language)
     RETURNING id`,
    [clientId, v.platform, v.externalId, v.title.slice(0, 300), v.language, v.format, v.url, v.publishedAt],
  );
  const s = v.stats;
  await query(
    `INSERT INTO video_snapshots (video_id, day, views, likes, comments, shares, saves)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (video_id, day) DO UPDATE SET views = EXCLUDED.views, likes = EXCLUDED.likes,
       comments = EXCLUDED.comments, shares = EXCLUDED.shares, saves = EXCLUDED.saves`,
    [row.id, day, s.views, s.likes, s.comments, s.shares, s.saves],
  );
}

export async function saveChannelDay(clientId: number, platform: string, day: string, data: { followers?: number; searchViews?: number }) {
  await query(
    `INSERT INTO channel_days (client_id, platform, day, followers_total, search_views)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (client_id, platform, day) DO UPDATE SET
       followers_total = COALESCE(EXCLUDED.followers_total, channel_days.followers_total),
       search_views = CASE WHEN $6 THEN EXCLUDED.search_views ELSE channel_days.search_views END`,
    [clientId, platform, day, data.followers ?? null, data.searchViews ?? 0, data.searchViews !== undefined],
  );
}

const langNames: Record<string, string> = {
  en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", kn: "Kannada", ml: "Malayalam", mr: "Marathi",
  bn: "Bengali", gu: "Gujarati", pa: "Punjabi", or: "Odia",
};
export const languageName = (code?: string | null) => (code ? langNames[code.slice(0, 2).toLowerCase()] ?? null : null);
