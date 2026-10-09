import "./helpers";
import "./publish-env";
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { encrypt } from "../lib/crypto";
import { publishReel } from "../lib/connectors/instagram";
import { uploadYoutube, youtubeTitle } from "../lib/connectors/youtube";
import { query } from "../lib/db";
import { directVideoUrl, houseClient, isMp4, linkFile, listPublications, platformsFor, publishDue, queuePublications, runPublications, type Posters } from "../lib/publish";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// The first bytes of a real MP4 ("....ftypisom").
const MP4 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 1, 2, 3, 4]);

async function client(slug: string) {
  const [c] = await query<{ id: number }>("INSERT INTO clients (slug, name, plan, lead_key) VALUES ($1, 'Test Co', 'growth', $1) RETURNING id", [slug]);
  return c.id;
}
async function connection(clientId: number, platform: string, canPublish: boolean) {
  const [c] = await query<{ id: number }>(
    `INSERT INTO connections (client_id, platform, account_id, account_name, access_token, token_expires_at, can_publish)
     VALUES ($1, $2, $3, $4, $5, now() + interval '1 hour', $6) RETURNING id`,
    [clientId, platform, `${platform}-${clientId}`, `@${platform}`, encrypt("token"), canPublish],
  );
  return c.id;
}
async function approvedItem(clientId: number, platform: string, publishOn: string | null = null) {
  const [i] = await query<{ id: number }>(
    `INSERT INTO content_items (client_id, title, platform, stage, video_url, caption, video_approved_at, publish_on)
     VALUES ($1, 'Clinic tip', $2, 'scheduled', 'https://drive.google.com/file/d/abc123/view?usp=sharing', 'Book now #dental', now(), $3) RETURNING id`,
    [clientId, platform, publishOn],
  );
  return i.id;
}
const fakePosters = (calls: string[], fail?: "youtube" | "instagram"): Posters => ({
  youtube: async (_c, file, meta) => {
    calls.push(`youtube:${meta.title}:${file.length}:${meta.short}`);
    if (fail === "youtube") throw new Error("quota");
    return { id: "yt1", url: "https://www.youtube.com/shorts/yt1" };
  },
  instagram: async (_c, link, caption) => {
    calls.push(`instagram:${caption}:${link}`);
    if (fail === "instagram") throw new Error("processing failed");
    return { id: "ig1", url: "https://www.instagram.com/reel/ig1/" };
  },
});

test("publish helpers: platforms, Drive links, MP4 check, YouTube titles", () => {
  assert.deepEqual(platformsFor("YouTube and Instagram"), ["youtube", "instagram"]);
  assert.deepEqual(platformsFor(""), ["youtube", "instagram"]);
  assert.deepEqual(platformsFor("Instagram"), ["instagram"]);
  assert.deepEqual(platformsFor("LinkedIn"), []);
  assert.equal(directVideoUrl("https://drive.google.com/file/d/abc_1-2/view?usp=sharing"), "https://drive.google.com/uc?export=download&id=abc_1-2");
  assert.equal(directVideoUrl("https://cdn.example.com/v.mp4"), "https://cdn.example.com/v.mp4");
  assert.ok(isMp4(MP4));
  assert.ok(!isMp4(new TextEncoder().encode("<!doctype html><html>")));
  assert.equal(youtubeTitle("  <b>Dental</b>   tips  "), "bDental/b tips");
  assert.equal(youtubeTitle("x".repeat(150)).length, 100);
});

test("YouTube upload: starts a resumable session, sends the bytes, returns the Shorts link", async () => {
  const calls: { url: string; method?: string; headers?: Record<string, string>; body?: unknown }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method, headers: init.headers as Record<string, string>, body: init.body });
    if (url.startsWith("https://upload.test/videos")) return new Response("{}", { status: 200, headers: { location: "https://upload.test/session/1" } });
    return new Response(JSON.stringify({ id: "vid42" }), { status: 200 });
  }) as typeof fetch;
  const conn = { id: 1, client_id: 1, account_id: "ch", access_token: encrypt("tok"), refresh_token: null, token_expires_at: new Date(Date.now() + 3600e3).toISOString() };
  const res = await uploadYoutube(conn, MP4, { title: "Dental <tip>", description: "Book now", short: true });
  assert.deepEqual(res, { id: "vid42", url: "https://www.youtube.com/shorts/vid42" });
  assert.equal(calls[0].headers?.Authorization, "Bearer tok");
  assert.equal(calls[0].headers?.["X-Upload-Content-Length"], String(MP4.length));
  const meta = JSON.parse(String(calls[0].body));
  assert.equal(meta.snippet.title, "Dental tip");
  assert.equal(meta.status.privacyStatus, "public");
  assert.equal(meta.status.selfDeclaredMadeForKids, false);
  assert.equal(calls[1].url, "https://upload.test/session/1");
  assert.equal(calls[1].method, "PUT");

  globalThis.fetch = (async () => new Response('{"error":{"errors":[{"reason":"insufficientPermissions"}]}}', { status: 403 })) as typeof fetch;
  await assert.rejects(uploadYoutube(conn, MP4, { title: "x", description: "", short: false }), /Reconnect YouTube/);
});

test("Instagram Reel: creates a container, waits until it is processed, publishes, returns the permalink", async () => {
  const seen: string[] = [];
  let polls = 0;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    seen.push(`${init?.method ?? "GET"} ${url.split("?")[0]}`);
    if (url.startsWith("https://graph.test/ig1/media_publish")) return Response.json({ id: "post9" });
    if (url.startsWith("https://graph.test/ig1/media")) {
      const body = new URLSearchParams(String(init?.body));
      assert.equal(body.get("media_type"), "REELS");
      assert.equal(body.get("video_url"), "https://blob.test/v.mp4");
      return Response.json({ id: "cont1" });
    }
    if (url.startsWith("https://graph.test/cont1")) return Response.json({ status_code: ++polls < 2 ? "IN_PROGRESS" : "FINISHED" });
    if (url.startsWith("https://graph.test/post9")) return Response.json({ permalink: "https://www.instagram.com/reel/p9/" });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  const res = await publishReel({ account_id: "ig1", access_token: encrypt("tok") }, "https://blob.test/v.mp4", "Hello", { pollMs: 1 });
  assert.deepEqual(res, { id: "post9", url: "https://www.instagram.com/reel/p9/" });
  assert.equal(polls, 2);
  assert.deepEqual(seen, ["POST https://graph.test/ig1/media", "GET https://graph.test/cont1", "GET https://graph.test/cont1", "POST https://graph.test/ig1/media_publish", "GET https://graph.test/post9"]);

  globalThis.fetch = (async (url: string) => (url.includes("/media") ? Response.json({ id: "c2" }) : Response.json({ status_code: "ERROR", status: "Unsupported format" }))) as typeof fetch;
  await assert.rejects(publishReel({ account_id: "ig1", access_token: encrypt("tok") }, "https://x", "c", { pollMs: 1 }), /Unsupported format/);
});

test("exports: posting to the house account, with a clear failure when an account isn't connected", async () => {
  const house = await houseClient();
  assert.equal((await houseClient()).id, house.id);
  await connection(house.id, "youtube", true);
  await connection(house.id, "instagram", false); // connected before posting existed: not used
  const ids = await queuePublications({ clientId: house.id, source: "export", sourceId: 7, platforms: ["youtube", "instagram"], title: "Demo", caption: "Try it", by: "admin" });
  const calls: string[] = [];
  await runPublications(ids, { bytes: async () => MP4, link: async () => "https://blob.test/x.mp4" }, true, fakePosters(calls));
  await runPublications(ids, { bytes: async () => MP4, link: async () => "https://blob.test/x.mp4" }, true, fakePosters(calls)); // a second run posts nothing
  assert.deepEqual(calls, [`youtube:Demo:${MP4.length}:true`]);
  const rows = await listPublications("export", [7]);
  const yt = rows.find((r) => r.platform === "youtube")!;
  const ig = rows.find((r) => r.platform === "instagram")!;
  assert.equal(yt.status, "done");
  assert.equal(yt.url, "https://www.youtube.com/shorts/yt1");
  assert.equal(ig.status, "error");
  assert.match(ig.error!, /No Instagram account is connected with permission to post/);
});

test("client videos: posted after approval on their date, to the right platforms, once", async () => {
  const c = await client("pub-co");
  await connection(c, "youtube", true);
  await connection(c, "instagram", true);
  const both = await approvedItem(c, "YouTube and Instagram");
  const later = await approvedItem(c, "YouTube", "2999-01-01");
  const linkedin = await approvedItem(c, "LinkedIn");
  const other = await client("no-posting-co");
  await connection(other, "youtube", false);
  const readOnly = await approvedItem(other, "YouTube");

  let fetched = "";
  globalThis.fetch = (async (url: string) => {
    fetched = url;
    return new Response(MP4);
  }) as typeof fetch;
  const calls: string[] = [];
  // Instagram fails here, so only the YouTube post lands and the item is still marked published.
  // The real download runs (through the mocked fetch); the Blob copy for Instagram is skipped.
  const files = (url: string, path: string) => ({ ...linkFile(url, path), link: async () => "https://blob.test/copy.mp4" });
  const res = await publishDue(fakePosters(calls, "instagram"), both, files);
  assert.deepEqual(res, { due: 1, posted: 1 });
  assert.equal(fetched, "https://drive.google.com/uc?export=download&id=abc123");
  assert.ok(calls[0].startsWith(`youtube:Clinic tip:${MP4.length}`));

  const [item] = await query<{ stage: string; published_url: string }>("SELECT stage, published_url FROM content_items WHERE id = $1", [both]);
  assert.equal(item.stage, "published");
  assert.equal(item.published_url, "https://www.youtube.com/shorts/yt1");
  const events = await query<{ body: string; internal: boolean }>("SELECT body, internal FROM content_events WHERE item_id = $1 ORDER BY id", [both]);
  assert.ok(events.some((e) => e.body === "Posted to YouTube: https://www.youtube.com/shorts/yt1" && !e.internal));
  assert.ok(events.some((e) => /Couldn't post to Instagram/.test(e.body) && e.internal));

  // Nothing else is due: a future date, a platform we don't post to, a client without posting rights,
  // and the item already tried.
  for (const id of [later, linkedin, readOnly, both]) assert.deepEqual(await publishDue(fakePosters([]), id), { due: 0, posted: 0 });
});
