import { one, query } from "./db";
import type { Client } from "./auth";

export type RangeId = 7 | 30 | 90;
export const ranges: RangeId[] = [7, 30, 90];

export function parseRange(v: string | undefined): RangeId {
  const n = Number(v);
  return n === 7 || n === 90 ? n : 30;
}

// Which dashboard blocks each plan unlocks.
export const planFeatures = {
  starter: { search: false, leads: false, topics: false, opportunities: false },
  growth: { search: true, leads: true, topics: true, opportunities: false },
  pro: { search: true, leads: true, topics: true, opportunities: true },
} as const;

type Snapshot = { video_id: number; day: string; views: number; likes: number; comments: number; shares: number; saves: number };
type Video = { id: number; platform: string; title: string; topic: string | null; language: string | null; format: string; published_at: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);

export type Metrics = {
  published: number;
  views: number;
  engagements: number;
  engagementRate: number;
  followers: number;
  searchViews: number;
  leads: number;
};

export type Dashboard = {
  range: RangeId;
  start: string;
  end: string;
  current: Metrics;
  previous: Metrics;
  series: { label: string; value: number }[];
  byLanguage: { label: string; value: number }[];
  byPlatform: { label: string; value: number }[];
  topics: { topic: string; format: string; views: number; engagementRate: number; leads: number }[];
  opportunities: { signal: string; location: string; action: string }[];
  lastSynced: string | null;
  trackingSince: string | null;
  hasData: boolean;
};

// Views etc. for a window = latest cumulative snapshot in the window minus the
// latest snapshot before it. With no earlier snapshot, a video published inside
// the window starts from 0; an older one starts from its first snapshot, so
// lifetime views from before tracking began are not counted as new.
function windowTotals(snaps: Snapshot[], from: string, to: string, published: Map<number, string>) {
  const byVideo = new Map<number, Snapshot[]>();
  for (const s of snaps) (byVideo.get(s.video_id) ?? byVideo.set(s.video_id, []).get(s.video_id)!).push(s);
  const perVideo = new Map<number, { views: number; eng: number }>();
  for (const [id, list] of byVideo) {
    const before = list.filter((s) => s.day < from).at(-1) ?? ((published.get(id) ?? "") < from ? list[0] : undefined);
    const last = list.filter((s) => s.day <= to).at(-1);
    if (!last || last.day < from) continue;
    const d = (k: keyof Snapshot) => Number(last[k]) - Number(before?.[k] ?? 0);
    perVideo.set(id, { views: d("views"), eng: d("likes") + d("comments") + d("shares") + d("saves") });
  }
  return perVideo;
}

function dailySeries(snaps: Snapshot[], days: string[], published: Map<number, string>) {
  const totals = new Map<string, number>();
  const lastByVideo = new Map<number, number>();
  const sorted = [...snaps].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.video_id - b.video_id));
  for (const s of sorted) {
    const prev = lastByVideo.get(s.video_id) ?? ((published.get(s.video_id) ?? "") < days[0] ? Number(s.views) : 0);
    lastByVideo.set(s.video_id, Number(s.views));
    if (s.day >= days[0]) totals.set(s.day, (totals.get(s.day) ?? 0) + Math.max(0, Number(s.views) - prev));
  }
  return days.map((d) => totals.get(d) ?? 0);
}

export async function loadDashboard(client: Client, range: RangeId, today = new Date(Date.now() + 5.5 * 36e5)): Promise<Dashboard> {
  // Dates are India calendar days (the shift makes toISOString read IST).
  const end = iso(addDays(today, -1)); // last complete day
  const start = iso(addDays(today, -range));
  const prevStart = iso(addDays(today, -2 * range));
  const prevEnd = iso(addDays(today, -range - 1));
  const fetchFrom = iso(addDays(today, -2 * range - 1));

  const videos = await query<Video>(
    "SELECT id, platform, title, topic, language, format, published_at::text FROM videos WHERE client_id = $1",
    [client.id],
  );
  const snaps = await query<Snapshot>(
    `SELECT s.video_id, s.day::text AS day, s.views, s.likes, s.comments, s.shares, s.saves
     FROM video_snapshots s JOIN videos v ON v.id = s.video_id
     WHERE v.client_id = $1 AND s.day BETWEEN $2 AND $3 ORDER BY s.day`,
    [client.id, fetchFrom, end],
  );
  const channel = await query<{ platform: string; day: string; followers_total: number | null; search_views: number }>(
    "SELECT platform, day::text AS day, followers_total, search_views FROM channel_days WHERE client_id = $1 AND day BETWEEN $2 AND $3 ORDER BY day",
    [client.id, fetchFrom, end],
  );
  const publishedOn = new Map(videos.map((v) => [v.id, (v.published_at ?? "").slice(0, 10)]));
  const first = await one<{ day: string }>(
    "SELECT min(s.day)::text AS day FROM video_snapshots s JOIN videos v ON v.id = s.video_id WHERE v.client_id = $1",
    [client.id],
  );
  const leadRows = await query<{ day: string; video_id: number | null; n: number }>(
    "SELECT day::text AS day, video_id, count(*)::int AS n FROM leads WHERE client_id = $1 AND day BETWEEN $2 AND $3 GROUP BY day, video_id",
    [client.id, prevStart, end],
  );
  const opps = await query<{ signal: string; location: string; action: string }>(
    "SELECT signal, location, action FROM opportunities WHERE client_id = $1 AND published ORDER BY created_at DESC LIMIT 6",
    [client.id],
  );
  const synced = await query<{ last: string | null }>(
    "SELECT max(last_synced_at)::text AS last FROM connections WHERE client_id = $1",
    [client.id],
  );

  const videoById = new Map(videos.map((v) => [v.id, v]));
  const metrics = (from: string, to: string): Metrics => {
    const per = windowTotals(snaps, from, to, publishedOn);
    let views = 0, eng = 0;
    for (const t of per.values()) { views += t.views; eng += t.eng; }
    const published = videos.filter((v) => v.published_at.slice(0, 10) >= from && v.published_at.slice(0, 10) <= to).length;
    // Follower growth: last minus first total in the window, per platform.
    let followers = 0, searchViews = 0;
    for (const platform of new Set(channel.map((c) => c.platform))) {
      const rows = channel.filter((c) => c.platform === platform && c.followers_total != null);
      const inWin = rows.filter((c) => c.day >= from && c.day <= to);
      const before = rows.filter((c) => c.day < from).at(-1);
      if (inWin.length) followers += Number(inWin.at(-1)!.followers_total) - Number((before ?? inWin[0]).followers_total);
    }
    for (const c of channel) if (c.day >= from && c.day <= to) searchViews += Number(c.search_views);
    const leads = leadRows.filter((l) => l.day >= from && l.day <= to).reduce((a, l) => a + l.n, 0);
    return { published, views, engagements: eng, engagementRate: views ? eng / views : 0, followers, searchViews, leads };
  };

  const current = metrics(start, end);
  const previous = metrics(prevStart, prevEnd);

  // Daily views; 90-day range is shown as 13 weekly buckets.
  const days = Array.from({ length: range }, (_, i) => iso(addDays(new Date(start), i)));
  const daily = dailySeries(snaps.filter((s) => s.day <= end), days, publishedOn);
  const fmtDay = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  const series =
    range === 90
      ? Array.from({ length: Math.ceil(range / 7) }, (_, w) => ({
          label: `Wk of ${fmtDay(days[w * 7])}`,
          value: daily.slice(w * 7, w * 7 + 7).reduce((a, b) => a + b, 0),
        }))
      : days.map((d, i) => ({ label: fmtDay(d), value: daily[i] }));

  const per = windowTotals(snaps, start, end, publishedOn);
  const group = (key: (v: Video) => string | null) => {
    const m = new Map<string, number>();
    for (const [id, t] of per) {
      const k = key(videoById.get(id)!) || "Other";
      m.set(k, (m.get(k) ?? 0) + t.views);
    }
    return [...m].map(([label, value]) => ({ label, value })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  };
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const leadsByVideo = new Map<number, number>();
  for (const l of leadRows) if (l.video_id && l.day >= start) leadsByVideo.set(l.video_id, (leadsByVideo.get(l.video_id) ?? 0) + l.n);
  const topicMap = new Map<string, { format: Set<string>; views: number; eng: number; leads: number }>();
  for (const [id, t] of per) {
    const v = videoById.get(id)!;
    const k = v.topic || v.title;
    const row = topicMap.get(k) ?? { format: new Set<string>(), views: 0, eng: 0, leads: 0 };
    row.format.add(`${cap(v.format)}${v.language ? `, ${v.language}` : ""}`);
    row.views += t.views; row.eng += t.eng; row.leads += leadsByVideo.get(id) ?? 0;
    topicMap.set(k, row);
  }
  const topics = [...topicMap]
    .map(([topic, r]) => ({ topic, format: [...r.format].slice(0, 2).join(" · "), views: r.views, engagementRate: r.views ? r.eng / r.views : 0, leads: r.leads }))
    .sort((a, b) => b.leads - a.leads || b.views - a.views)
    .slice(0, 5);

  return {
    range, start, end, current, previous, series,
    byLanguage: group((v) => v.language).slice(0, 7),
    byPlatform: group((v) => cap(v.platform === "youtube" ? "YouTube" : v.platform)),
    topics, opportunities: opps,
    lastSynced: synced[0]?.last ?? null,
    trackingSince: first?.day ?? null,
    hasData: videos.length > 0,
  };
}
