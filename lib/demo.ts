// Example data for the public dashboard demo. Not real client results.

export type PeriodId = "7d" | "30d" | "90d";

export type Kpi = { key: string; label: string; value: string; delta: number; note?: string };
export type Period = {
  id: PeriodId;
  label: string;
  compare: string;
  kpis: Kpi[];
  views: { label: string; value: number }[];
  byLanguage: { label: string; value: number }[];
  byPlatform: { label: string; value: number }[];
};

// Small deterministic generator so the demo looks the same on every build.
function series(n: number, base: number, growth: number, seed: number) {
  let x = seed;
  const rand = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, (_, i) => Math.round(base * (1 + growth * (i / n)) * (0.78 + rand() * 0.44)));
}

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);
const compact = (n: number) =>
  n >= 100000 ? `${(n / 100000).toFixed(n >= 1000000 ? 1 : 2).replace(/\.?0+$/, "")}L` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n);

function build(id: PeriodId, label: string, compare: string, points: string[], base: number, growth: number, seed: number, scale: number): Period {
  const values = series(points.length, base, growth, seed);
  const total = values.reduce((a, b) => a + b, 0);
  const k = (v: number) => Math.round(v * scale);
  return {
    id,
    label,
    compare,
    kpis: [
      { key: "published", label: "Content published", value: fmt(k(44)), delta: 12, note: `${fmt(k(16))} videos, ${fmt(k(28))} repurposed posts` },
      { key: "views", label: "Views", value: compact(total), delta: 38 },
      { key: "engagement", label: "Engagement rate", value: "6.4%", delta: 9, note: "Likes, comments, shares, saves" },
      { key: "leads", label: "Leads generated", value: fmt(k(137)), delta: 52, note: "WhatsApp clicks and form fills" },
      { key: "search", label: "Search views", value: compact(k(92400)), delta: 27, note: "Views that came from YouTube search" },
      { key: "subs", label: "Subscriber growth", value: `+${fmt(k(2140))}`, delta: 31, note: "Across all platforms" },
    ],
    views: points.map((l, i) => ({ label: l, value: values[i] })),
    byLanguage: [
      { label: "Hindi", value: Math.round(total * 0.34) },
      { label: "English", value: Math.round(total * 0.27) },
      { label: "Tamil", value: Math.round(total * 0.16) },
      { label: "Telugu", value: Math.round(total * 0.13) },
      { label: "Kannada", value: Math.round(total * 0.1) },
    ],
    byPlatform: [
      { label: "Instagram", value: Math.round(total * 0.46) },
      { label: "YouTube", value: Math.round(total * 0.39) },
      { label: "Facebook", value: Math.round(total * 0.15) },
    ],
  };
}

const days = (n: number, end = 29) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(2026, 8, end - (n - 1 - i));
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  });

export const periods: Period[] = [
  build("7d", "Last 7 days", "vs previous 7 days", days(7), 10200, 0.25, 7, 0.25),
  build("30d", "Last 30 days", "vs previous 30 days", days(30), 9400, 0.45, 30, 1),
  build("90d", "Last 90 days", "vs previous 90 days",
    Array.from({ length: 13 }, (_, i) => `Wk ${i + 1}`), 52000, 1.1, 90, 2.7),
];

export const topics = [
  { topic: "Morning skincare in 60 seconds", format: "Short, Hindi", views: "84K", engagement: "9.1%", leads: 31 },
  { topic: "Why sunscreen fails in humid cities", format: "Short, Tamil", views: "61K", engagement: "7.8%", leads: 22 },
  { topic: "3 ingredients to avoid with acne", format: "Short, English", views: "47K", engagement: "6.9%", leads: 18 },
  { topic: "Monsoon hair fall, explained", format: "Short, Telugu", views: "39K", engagement: "7.2%", leads: 14 },
  { topic: "Dermatologist myths vs facts", format: "Long-form, Hindi", views: "22K", engagement: "5.4%", leads: 11 },
];

export const opportunities = [
  { signal: "46 comments asking for the price", where: "Morning skincare in 60 seconds · Instagram", action: "Pin a reply with the product link and a WhatsApp button." },
  { signal: "Tamil views up 3x in 30 days", where: "Tamil dubs · YouTube Shorts", action: "Move 2 more videos a month to Tamil-first scripts." },
  { signal: "Search traffic for \"sunscreen for oily skin\"", where: "YouTube search · 8.2K impressions", action: "Make a long-form buying guide that answers it." },
  { signal: "High saves, low clicks", where: "3 ingredients to avoid · Instagram", action: "Add a free checklist offer in the caption to capture leads." },
];
