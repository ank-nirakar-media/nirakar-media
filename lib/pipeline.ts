// Content pipeline: every piece of content moves idea -> script -> production -> QA ->
// client review -> scheduled -> published. Clients approve the script and the final
// video from their portal; anything left waiting 48 hours is approved automatically.
import { one, query } from "./db";
import { notifyAutoApproved, notifyReviewRequested, sendReminders } from "./notify";

export const stages = [
  { id: "idea", label: "Idea", client: "Planned" },
  { id: "script", label: "Script", client: "Script in progress" },
  { id: "production", label: "Production", client: "In production" },
  { id: "qa", label: "QA", client: "Quality check" },
  { id: "review", label: "Client review", client: "Ready for your review" },
  { id: "scheduled", label: "Scheduled", client: "Scheduled" },
  { id: "published", label: "Published", client: "Published" },
] as const;
export type Stage = (typeof stages)[number]["id"];
export const isStage = (v: string): v is Stage => stages.some((s) => s.id === v);
export const stageOf = (id: string) => stages.find((s) => s.id === id) ?? stages[0];

export const formats = [
  { id: "short", label: "Short or Reel" },
  { id: "long", label: "Long-form video" },
] as const;
export const formatLabel = (id: string) => formats.find((f) => f.id === id)?.label ?? id;
export const platforms = ["YouTube", "Instagram", "YouTube and Instagram", "Facebook", "LinkedIn"];

export const AUTO_APPROVE_HOURS = 48;

export type Review = "script" | "video";
export type Item = {
  id: number;
  client_id: number;
  client_slug: string;
  client_name: string;
  title: string;
  format: string;
  platform: string;
  language: string;
  stage: Stage;
  brief: string;
  script: string;
  video_url: string;
  published_url: string;
  internal_notes: string;
  due_date: string | null;
  publish_on: string | null;
  review: Review | null;
  review_requested_at: string | null;
  changes_requested: string;
  script_approved_at: string | null;
  video_approved_at: string | null;
  updated_at: string;
};
export type Event = { id: number; actor: string; kind: string; body: string; internal: boolean; created_at: string };

const columns = `i.id, i.client_id, c.slug AS client_slug, c.name AS client_name, i.title, i.format, i.platform, i.language,
  i.stage, i.brief, i.script, i.video_url, i.published_url, i.internal_notes, i.due_date::text, i.publish_on::text,
  i.review, i.review_requested_at::text, i.changes_requested, i.script_approved_at::text, i.video_approved_at::text,
  i.updated_at::text`;

export async function listItems(clientId?: number): Promise<Item[]> {
  await processDeadlines();
  return query<Item>(
    `SELECT ${columns} FROM content_items i JOIN clients c ON c.id = i.client_id
     ${clientId ? "WHERE i.client_id = $1" : ""}
     ORDER BY COALESCE(i.publish_on, i.due_date) NULLS LAST, i.id`,
    clientId ? [clientId] : [],
  );
}

export async function getItem(id: number): Promise<Item | undefined> {
  if (!Number.isInteger(id) || id <= 0) return undefined;
  await processDeadlines();
  return one<Item>(`SELECT ${columns} FROM content_items i JOIN clients c ON c.id = i.client_id WHERE i.id = $1`, [id]);
}

export async function listEvents(itemId: number, includeInternal: boolean): Promise<Event[]> {
  return query<Event>(
    `SELECT id, actor, kind, body, internal, created_at::text FROM content_events
     WHERE item_id = $1 ${includeInternal ? "" : "AND NOT internal"} ORDER BY created_at DESC, id DESC`,
    [itemId],
  );
}

export async function addEvent(itemId: number, actor: string, kind: string, body = "", internal = false) {
  await query("INSERT INTO content_events (item_id, actor, kind, body, internal) VALUES ($1, $2, $3, $4, $5)", [itemId, actor, kind, body, internal]);
}

export const reviewLabel = (r: string) => (r === "script" ? "Script" : "Video");

// Approves whatever each matching item is waiting on. An approved script moves the item into
// production; an approved video moves it to scheduled. Returns what was approved.
async function approveWhere(where: string, params: unknown[]) {
  return query<{ id: number; review: Review }>(
    `WITH old AS (SELECT id, review FROM content_items WHERE review IS NOT NULL AND ${where} FOR UPDATE)
     UPDATE content_items c SET
       script_approved_at = CASE WHEN old.review = 'script' THEN now() ELSE c.script_approved_at END,
       video_approved_at  = CASE WHEN old.review = 'video' THEN now() ELSE c.video_approved_at END,
       stage = CASE WHEN old.review = 'script' AND c.stage = 'script' THEN 'production'
                    WHEN old.review = 'video' THEN 'scheduled' ELSE c.stage END,
       review = NULL, review_requested_at = NULL, changes_requested = '', updated_at = now()
     FROM old WHERE c.id = old.id
     RETURNING c.id, old.review`,
    params,
  );
}

// Runs on page loads and from the cron: approves anything past its 48 hours, then sends the
// 24-hour reminders. Both claim rows in a single UPDATE, so overlapping runs don't double up.
export async function processDeadlines() {
  const done = await approveWhere(`review_requested_at < now() - interval '${AUTO_APPROVE_HOURS} hours'`, []);
  for (const d of done) await addEvent(d.id, "Nirakar Media", "approved", `${reviewLabel(d.review)} approved automatically after ${AUTO_APPROVE_HOURS} hours with no reply.`);
  if (done.length) await notifyAutoApproved(done);
  const reminded = await sendReminders();
  return { autoApproved: done.length, reminded };
}

export async function approve(itemId: number, actor: string) {
  const [done] = await approveWhere("id = $1", [itemId]);
  if (done) await addEvent(itemId, actor, "approved", `${reviewLabel(done.review)} approved.`);
  return done?.review ?? null;
}

export async function requestChanges(itemId: number, actor: string, comment: string) {
  const row = await one<{ review: Review }>(
    `WITH old AS (SELECT id, review FROM content_items WHERE id = $1 AND review IS NOT NULL FOR UPDATE)
     UPDATE content_items c SET review = NULL, review_requested_at = NULL, changes_requested = $2,
       stage = CASE WHEN old.review = 'video' THEN 'production' ELSE 'script' END, updated_at = now()
     FROM old WHERE c.id = old.id RETURNING old.review`,
    [itemId, comment],
  );
  if (row) await addEvent(itemId, actor, "changes", `Changes requested on the ${row.review}: ${comment}`);
  return row?.review ?? null;
}

// Returns an error message, or null when the item was sent.
export async function sendForReview(item: Item, kind: Review, actor: string): Promise<string | null> {
  if (kind === "script" && !item.script.trim()) return "Write the script before sending it for approval.";
  if (kind === "video" && !item.video_url.trim()) return "Add the video link before sending it for approval.";
  await query(
    `UPDATE content_items SET review = $2, review_requested_at = now(), changes_requested = '',
       stage = $3, updated_at = now() WHERE id = $1`,
    [item.id, kind, kind === "video" ? "review" : "script"],
  );
  await addEvent(item.id, actor, "sent", `${reviewLabel(kind)} sent for approval.`);
  await notifyReviewRequested(item, kind);
  return null;
}

// When a waiting approval will be given automatically.
export function autoApproveAt(item: Pick<Item, "review_requested_at">): Date | null {
  return item.review_requested_at ? new Date(new Date(item.review_requested_at).getTime() + AUTO_APPROVE_HOURS * 36e5) : null;
}

export function hoursLeft(item: Pick<Item, "review_requested_at">): number | null {
  const at = autoApproveAt(item);
  return at ? Math.max(0, Math.ceil((at.getTime() - Date.now()) / 36e5)) : null;
}

// The date an item shows on the calendar.
export const calendarDate = (i: Pick<Item, "publish_on" | "due_date">) => i.publish_on ?? i.due_date;

export function todayIst() {
  return new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
}

export function parseMonth(v: string | undefined): string {
  return v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : todayIst().slice(0, 7);
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatTime(ts: string) {
  return new Date(ts).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

// Videos the plan includes each month, read from its volume line ("8 short videos a month").
export function monthlyQuota(volume: string) {
  return Number(volume.match(/\d+/)?.[0] ?? 0);
}
