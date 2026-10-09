// Posting finished videos to YouTube and Instagram. Two sources:
// - "export": an MP4 from Admin > Exports, posted to Nirakar Media's own accounts (the house client) when
//   the team presses Publish.
// - "content": a client's video, posted to the client's accounts once they approve it (or it is
//   auto-approved), on its publish date. Only connections that were granted posting rights are used.
import { one, query } from "./db";
import { randomToken } from "./crypto";
import { publishReel } from "./connectors/instagram";
import { uploadYoutube, type YoutubeConn } from "./connectors/youtube";
import { addEvent } from "./pipeline";
import { downloadUrl } from "./video/exports";

export type Platform = "youtube" | "instagram";
export type Publication = {
  id: number;
  client_id: number;
  platform: Platform;
  source: "export" | "content";
  source_id: number;
  status: "queued" | "publishing" | "done" | "error";
  title: string;
  url: string | null;
  error: string | null;
  created_at: string;
};
type Conn = YoutubeConn & { platform: Platform };

// Nirakar Media's own channel and Instagram are connected like a client's, under this workspace.
export const HOUSE_SLUG = "nirakar-media";
// A publication stuck this long in "publishing" was cut off (the function timed out) and is marked failed.
const STUCK_MS = 15 * 60 * 1000;

export async function houseClient(): Promise<{ id: number; slug: string }> {
  await query(
    "INSERT INTO clients (slug, name, plan, languages, lead_key) VALUES ($1, 'Nirakar Media', 'pro', 'English, Hindi', $2) ON CONFLICT (slug) DO NOTHING",
    [HOUSE_SLUG, randomToken(8)],
  );
  return (await one<{ id: number; slug: string }>("SELECT id, slug FROM clients WHERE slug = $1", [HOUSE_SLUG]))!;
}

// Which platforms a content item goes to, from its Platform field. "Not decided" means both.
export function platformsFor(choice: string): Platform[] {
  if (choice === "YouTube") return ["youtube"];
  if (choice === "Instagram") return ["instagram"];
  if (choice === "" || choice === "YouTube and Instagram") return ["youtube", "instagram"];
  return [];
}

// The connection used for posting on each platform: active, granted posting rights, most recent first.
export async function publishConnections(clientId: number): Promise<Partial<Record<Platform, { id: number; account_name: string }>>> {
  const rows = await query<{ id: number; platform: Platform; account_name: string }>(
    `SELECT id, platform, account_name FROM connections WHERE client_id = $1 AND status <> 'disconnected' AND can_publish
     AND platform IN ('youtube', 'instagram') ORDER BY id DESC`,
    [clientId],
  );
  const out: Partial<Record<Platform, { id: number; account_name: string }>> = {};
  for (const r of rows) out[r.platform] ??= { id: r.id, account_name: r.account_name };
  return out;
}

// Creates one row per platform. A platform with no posting connection gets a failed row saying so.
export async function queuePublications(p: { clientId: number; source: "export" | "content"; sourceId: number; platforms: Platform[]; title: string; caption: string; by: string }) {
  const conns = await publishConnections(p.clientId);
  const ids: number[] = [];
  for (const platform of p.platforms) {
    const conn = conns[platform];
    const [row] = await query<{ id: number }>(
      `INSERT INTO publications (client_id, platform, source, source_id, connection_id, title, caption, status, error, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [p.clientId, platform, p.source, p.sourceId, conn?.id ?? null, p.title, p.caption, conn ? "queued" : "error",
        conn ? null : `No ${platform === "youtube" ? "YouTube" : "Instagram"} account is connected with permission to post.`, p.by],
    );
    ids.push(row.id);
  }
  return ids;
}

export async function listPublications(source: "export" | "content", sourceIds: number[]): Promise<Publication[]> {
  if (!sourceIds.length) return [];
  await query(
    `UPDATE publications SET status = 'error', error = 'Posting was cut off before it finished. Try again.', updated_at = now()
     WHERE status = 'publishing' AND updated_at < now() - interval '${STUCK_MS / 60000} minutes'`,
  );
  const rows = await query<Publication>(
    `SELECT id, client_id, platform, source, source_id, status, title, url, error, created_at::text FROM publications
     WHERE source = $1 AND source_id = ANY($2::int[]) ORDER BY id DESC`,
    [source, sourceIds],
  );
  return rows;
}

// Where the video comes from: bytes for YouTube, a link Instagram can download for Instagram.
export type VideoFile = { bytes: () => Promise<Uint8Array<ArrayBuffer>>; link: () => Promise<string> };

// MP4 files carry "ftyp" at byte 4. Anything else (a sign-in page, a Drive warning page) is refused.
export const isMp4 = (b: Uint8Array) => b.length > 8 && String.fromCharCode(...b.subarray(4, 8)) === "ftyp";

// A Google Drive share link (drive.google.com/file/d/ID/view) becomes its direct download link.
export function directVideoUrl(url: string) {
  const id = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]+)/)?.[1];
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url;
}

async function download(url: string): Promise<Uint8Array<ArrayBuffer>> {
  const res = await fetch(url, { cache: "no-store", redirect: "follow" });
  if (!res.ok) throw new Error(`Couldn't download the video (${res.status}).`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!isMp4(bytes)) throw new Error("The video link isn't a downloadable MP4 file. Use a direct MP4 link or a Google Drive file shared with 'Anyone with the link'.");
  return bytes;
}

function once<T>(f: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | undefined;
  return () => (p ??= f());
}

export function exportFile(pathname: string): VideoFile {
  const link = once(async () => {
    const url = await downloadUrl(pathname);
    if (!url) throw new Error("Couldn't make a download link for the export.");
    return url;
  });
  return { link, bytes: once(async () => download(await link())) };
}

// A client's video link. Instagram is given a copy in our private Blob store (via a signed link), because
// it can't follow Drive's download redirects reliably.
export function linkFile(url: string, copyPath: string): VideoFile {
  const bytes = once(() => download(directVideoUrl(url)));
  const link = once(async () => {
    const { put } = await import("@vercel/blob");
    await put(copyPath, Buffer.from(await bytes()), { access: "private", contentType: "video/mp4", allowOverwrite: true });
    const signed = await downloadUrl(copyPath);
    if (!signed) throw new Error("Couldn't make a download link for Instagram.");
    return signed;
  });
  return { bytes, link };
}

export type Posters = {
  youtube: (conn: Conn, file: Uint8Array<ArrayBuffer>, meta: { title: string; description: string; short: boolean }) => Promise<{ id: string; url: string | null }>;
  instagram: (conn: Conn, link: string, caption: string) => Promise<{ id: string; url: string | null }>;
};
const realPosters: Posters = { youtube: uploadYoutube, instagram: publishReel };

// Posts each queued row. Rows are claimed with one UPDATE, so a double click can't post twice.
export async function runPublications(ids: number[], file: VideoFile, short: boolean, posters: Posters = realPosters) {
  for (const id of ids) {
    const row = await one<{ id: number; platform: Platform; title: string; caption: string; connection_id: number }>(
      "UPDATE publications SET status = 'publishing', updated_at = now() WHERE id = $1 AND status = 'queued' RETURNING id, platform, title, caption, connection_id",
      [id],
    );
    if (!row) continue;
    try {
      const conn = await one<Conn>(
        "SELECT id, client_id, platform, account_id, access_token, refresh_token, token_expires_at::text FROM connections WHERE id = $1",
        [row.connection_id],
      );
      if (!conn) throw new Error("The connected account was removed.");
      const res = row.platform === "youtube"
        ? await posters.youtube(conn, await file.bytes(), { title: row.title, description: row.caption, short })
        : await posters.instagram(conn, await file.link(), row.caption || row.title);
      await query("UPDATE publications SET status = 'done', external_id = $2, url = $3, error = NULL, updated_at = now() WHERE id = $1", [id, res.id, res.url]);
    } catch (err) {
      console.error("Publish failed", id, err);
      await query("UPDATE publications SET status = 'error', error = $2, updated_at = now() WHERE id = $1", [id, String((err as Error).message ?? err).slice(0, 500)]);
    }
  }
}

// Publishes an MP4 export to Nirakar Media's own accounts.
export async function publishExport(exportId: number, p: { platforms: Platform[]; title: string; caption: string; by: string }, posters?: Posters) {
  const row = await one<{ source: string; status: string; url: string | null }>("SELECT source, status, url FROM video_exports WHERE id = $1", [exportId]);
  if (!row || row.status !== "done" || !row.url) return { error: "That export isn't finished." };
  const house = await houseClient();
  const ids = await queuePublications({ clientId: house.id, source: "export", sourceId: exportId, ...p });
  return { ids, run: () => runPublications(ids, exportFile(row.url!), row.source !== "walkthrough", posters) };
}

type ContentRow = { id: number; client_id: number; title: string; format: string; platform: string; caption: string; video_url: string };

// Posts one approved client video to the client's accounts, then marks it published. Returns the
// publication ids (empty when there was nothing to post).
export async function publishContent(itemId: number, by: string, posters?: Posters, fileFor: typeof linkFile = linkFile): Promise<number[]> {
  const item = await one<ContentRow>("SELECT id, client_id, title, format, platform, caption, video_url FROM content_items WHERE id = $1", [itemId]);
  if (!item) return [];
  // Platforms it was already posted to are skipped, so "Post now" after a failure can't post twice.
  const done = await query<{ platform: Platform }>("SELECT platform FROM publications WHERE source = 'content' AND source_id = $1 AND status IN ('done', 'publishing', 'queued')", [item.id]);
  const platforms = platformsFor(item.platform).filter((p) => !done.some((d) => d.platform === p));
  if (!platforms.length) return [];
  if (!item.video_url) {
    await addEvent(item.id, "Nirakar Media", "note", "Couldn't post the video: there is no video link on this item.", true);
    return [];
  }
  const ids = await queuePublications({ clientId: item.client_id, source: "content", sourceId: item.id, platforms, title: item.title, caption: item.caption, by });
  await runPublications(ids, fileFor(item.video_url, `publish/content-${item.id}.mp4`), item.format === "short", posters);
  const rows = await query<{ platform: Platform; status: string; url: string | null; error: string | null }>(
    "SELECT platform, status, url, error FROM publications WHERE id = ANY($1::int[]) ORDER BY id", [ids],
  );
  for (const r of rows) {
    const name = r.platform === "youtube" ? "YouTube" : "Instagram";
    if (r.status === "done") await addEvent(item.id, "Nirakar Media", "published", `Posted to ${name}${r.url ? `: ${r.url}` : "."}`);
    else await addEvent(item.id, "Nirakar Media", "note", `Couldn't post to ${name}: ${r.error}`, true);
  }
  const posted = rows.filter((r) => r.status === "done");
  if (posted.length) {
    const url = (posted.find((r) => r.platform === "youtube") ?? posted[0]).url ?? "";
    await query(
      "UPDATE content_items SET stage = 'published', published_url = CASE WHEN published_url = '' THEN $2 ELSE published_url END, updated_at = now() WHERE id = $1",
      [item.id, url],
    );
  }
  return ids;
}

// Approved client videos whose publish date has come (today in India, or no date), not yet posted or
// tried, for clients that connected an account with posting rights. Run by the daily cron and right
// after a client approves.
export async function publishDue(posters?: Posters, onlyItem?: number, fileFor?: typeof linkFile) {
  const due = await query<{ id: number }>(
    `SELECT i.id FROM content_items i
     WHERE i.stage = 'scheduled' AND i.video_approved_at IS NOT NULL AND i.published_url = '' AND i.video_url <> ''
       AND i.platform IN ('', 'YouTube', 'Instagram', 'YouTube and Instagram')
       AND (i.publish_on IS NULL OR i.publish_on <= (now() AT TIME ZONE 'Asia/Kolkata')::date)
       AND NOT EXISTS (SELECT 1 FROM publications p WHERE p.source = 'content' AND p.source_id = i.id)
       AND EXISTS (SELECT 1 FROM connections c WHERE c.client_id = i.client_id AND c.can_publish AND c.status <> 'disconnected')
       ${onlyItem ? "AND i.id = $1" : ""}
     ORDER BY i.id`,
    onlyItem ? [onlyItem] : [],
  );
  let posted = 0;
  for (const d of due) if ((await publishContent(d.id, "auto", posters, fileFor)).length) posted++;
  return { due: due.length, posted };
}
