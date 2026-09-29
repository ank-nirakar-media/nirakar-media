// Seeds an admin login and a demo client with ~100 days of realistic data.
// Usage: npm run seed            (uses DATABASE_URL, or local PGlite in ./.data)
// Env:   ADMIN_EMAIL, ADMIN_PASSWORD (defaults printed at the end)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

async function connect() {
  if (process.env.DATABASE_URL) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
    return { q: (t, p = []) => sql.unsafe(t, p), end: () => sql.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  return { q: async (t, p = []) => (await db.query(t, p)).rows, end: () => db.close() };
}

const hash = (pw) => {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString("base64")}$${crypto.scryptSync(pw, salt, 64).toString("base64")}`;
};
let seed = 42;
const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const iso = (d) => d.toISOString().slice(0, 10);

const db = await connect();
const schema = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
for (const stmt of schema.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) await db.q(stmt);

const adminEmail = (process.env.ADMIN_EMAIL || "admin@nirakarmedia.com").toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
await db.q(
  `INSERT INTO users (email, name, role, password_hash) VALUES ($1, 'Nirakar team', 'admin', $2)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
  [adminEmail, hash(adminPassword)],
);

// Demo client (clearly fictional). Re-running the seed rebuilds its data.
await db.q("DELETE FROM clients WHERE slug = 'glow-studio-demo'");
const [client] = await db.q(
  "INSERT INTO clients (slug, name, plan, languages, lead_key) VALUES ('glow-studio-demo', 'Glow Studio (demo)', 'pro', 'Hindi, English, Tamil, Telugu, Kannada', $1) RETURNING id",
  [crypto.randomBytes(18).toString("base64url")],
);
const demoPassword = "demo-glow-2026";
await db.q(
  `INSERT INTO users (email, name, role, client_id, password_hash) VALUES ('demo@glowstudio.example', 'Demo client', 'client', $1, $2)
   ON CONFLICT (email) DO UPDATE SET client_id = EXCLUDED.client_id, password_hash = EXCLUDED.password_hash`,
  [client.id, hash(demoPassword)],
);

const topics = [
  ["Morning skincare in 60 seconds", 1.8], ["Why sunscreen fails in humid cities", 1.4], ["3 ingredients to avoid with acne", 1.1],
  ["Monsoon hair fall, explained", 1.0], ["Dermatologist myths vs facts", 0.8], ["Glass skin on a budget", 0.9], ["Night routine for oily skin", 0.7],
];
const langs = [["Hindi", 1.3], ["English", 1.0], ["Tamil", 0.9], ["Telugu", 0.8], ["Kannada", 0.6]];
const today = new Date(); today.setUTCHours(0, 0, 0, 0);
const DAYS = 100;
const videos = [];
for (let i = 0; i < 64; i++) {
  const [topic, tw] = topics[i % topics.length];
  const [language, lw] = langs[Math.floor(rand() * langs.length)];
  const platform = rand() < 0.55 ? "instagram" : "youtube";
  const age = Math.floor(rand() * (DAYS - 2)) + 2;
  const published = new Date(today.getTime() - age * 864e5);
  const [row] = await db.q(
    `INSERT INTO videos (client_id, platform, external_id, title, topic, language, format, url, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8) RETURNING id`,
    [client.id, platform, `demo-${i}`, `${topic} (${language})`, topic, language, i % 17 === 0 ? "long-form" : "short", published],
  );
  // Growth over time: newer videos in a growing channel get more reach.
  const recency = 0.6 + (1 - age / DAYS) * 1.2;
  videos.push({ id: row.id, age, reach: 9000 * tw * lw * recency * (0.6 + rand() * 0.8), eng: 0.045 + rand() * 0.04 });
}

for (const v of videos) {
  const rows = [];
  for (let d = v.age; d >= 1; d--) {
    const t = v.age - d + 1; // days since publish
    const total = v.reach * (1 - Math.exp(-t / 4)) + v.reach * 0.002 * t;
    const views = Math.round(total);
    rows.push([iso(new Date(today.getTime() - d * 864e5)), views, Math.round(views * v.eng * 0.7), Math.round(views * v.eng * 0.08), Math.round(views * v.eng * 0.1), Math.round(views * v.eng * 0.12)]);
  }
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const values = chunk.map((_, j) => `($1, $${j * 6 + 2}, $${j * 6 + 3}, $${j * 6 + 4}, $${j * 6 + 5}, $${j * 6 + 6}, $${j * 6 + 7})`).join(",");
    await db.q(`INSERT INTO video_snapshots (video_id, day, views, likes, comments, shares, saves) VALUES ${values}`, [v.id, ...chunk.flat()]);
  }
}

let ig = 18400, yt = 9200;
for (let d = DAYS; d >= 1; d--) {
  const day = iso(new Date(today.getTime() - d * 864e5));
  const growth = 1 + (DAYS - d) / DAYS;
  ig += Math.round((28 + rand() * 30) * growth);
  yt += Math.round((14 + rand() * 20) * growth);
  await db.q("INSERT INTO channel_days (client_id, platform, day, followers_total, search_views) VALUES ($1, 'instagram', $2, $3, 0)", [client.id, day, ig]);
  await db.q("INSERT INTO channel_days (client_id, platform, day, followers_total, search_views) VALUES ($1, 'youtube', $2, $3, $4)", [client.id, day, yt, Math.round((900 + rand() * 700) * growth)]);
  const leads = Math.round((1.5 + rand() * 4) * growth);
  for (let k = 0; k < leads; k++) {
    const v = videos[Math.floor(rand() * 20)];
    await db.q("INSERT INTO leads (client_id, video_id, source, day, created_at) VALUES ($1, $2, 'link:demo', $3, $3::date + interval '12 hours')", [client.id, v.id, day]);
  }
}

await db.q("INSERT INTO links (code, client_id, label, target_url) VALUES ('demoglow', $1, 'WhatsApp order link', 'https://wa.me/910000000000') ON CONFLICT DO NOTHING", [client.id]);
const opps = [
  ["46 comments asking for the price", "Morning skincare in 60 seconds · Instagram", "Pin a reply with the product link and a WhatsApp button."],
  ["Tamil views up sharply this month", "Tamil dubs · YouTube Shorts", "Move 2 more videos a month to Tamil-first scripts."],
  ["Search traffic for \"sunscreen for oily skin\"", "YouTube search", "Make a long-form buying guide that answers it."],
  ["High saves, low clicks", "3 ingredients to avoid with acne · Instagram", "Add a free checklist offer in the caption to capture leads."],
];
for (const [signal, location, action] of opps) {
  await db.q("INSERT INTO opportunities (client_id, signal, location, action, published) VALUES ($1, $2, $3, $4, true)", [client.id, signal, location, action]);
}
await db.q("INSERT INTO connections (client_id, platform, account_id, account_name, status, last_synced_at) VALUES ($1, 'youtube', 'demo-yt', 'Glow Studio (demo channel)', 'active', now()), ($1, 'instagram', 'demo-ig', '@glowstudio.demo', 'active', now())", [client.id]);

await db.end();
console.log(`Seeded.
  Admin login:       ${adminEmail} / ${adminPassword}
  Demo client login: demo@glowstudio.example / ${demoPassword}
  Demo dashboard:    /portal/c/glow-studio-demo`);
