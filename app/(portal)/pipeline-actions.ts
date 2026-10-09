"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireClientAccess } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { notifyClientMessage, notifyTeamOfClient } from "@/lib/notify";
import { publishContent, publishDue } from "@/lib/publish";
import { addEvent, approve, formats, getItem, isStage, platforms, requestChanges, sendForReview, stageOf, type Review } from "@/lib/pipeline";

const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);
const date = (f: FormData, k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(str(f, k)) ? str(f, k) : null);
const link = (f: FormData, k: string) => {
  const v = str(f, k, 1000);
  return v && !/^https?:\/\//i.test(v) ? `https://${v}` : v;
};
const pick = (v: string, allowed: readonly string[], fallback: string) => (allowed.includes(v) ? v : fallback);

// ---- Admin ----
// Admin actions show to clients as "Nirakar Media".
const TEAM = "Nirakar Media";

export async function createItem(form: FormData) {
  await requireAdmin();
  const client = await one<{ id: number; languages: string }>("SELECT id, languages FROM clients WHERE slug = $1", [str(form, "client")]);
  const title = str(form, "title", 200);
  if (!client || !title) redirect(`/admin/content?error=new`);
  const row = await one<{ id: number }>(
    `INSERT INTO content_items (client_id, title, format, platform, language, brief, due_date, publish_on)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      client.id, title,
      pick(str(form, "format"), formats.map((f) => f.id), "short"),
      pick(str(form, "platform"), platforms, ""),
      str(form, "language", 60) || client.languages.split(",")[0].trim(),
      str(form, "brief", 3000),
      date(form, "due_date"), date(form, "publish_on"),
    ],
  );
  await addEvent(row!.id, TEAM, "created", "Added to the content plan.");
  redirect(`/admin/content/${row!.id}?saved=1`);
}

export async function updateItem(form: FormData) {
  await requireAdmin();
  const item = await getItem(Number(form.get("id")));
  if (!item) redirect("/admin/content");
  const stage = str(form, "stage");
  const nextStage = isStage(stage) ? stage : item.stage;
  await query(
    `UPDATE content_items SET title = $2, format = $3, platform = $4, language = $5, brief = $6, script = $7,
       video_url = $8, published_url = $9, internal_notes = $10, due_date = $11, publish_on = $12, stage = $13, caption = $14,
       review = CASE WHEN $13 IN ('published', 'idea') THEN NULL ELSE review END,
       review_requested_at = CASE WHEN $13 IN ('published', 'idea') THEN NULL ELSE review_requested_at END,
       updated_at = now()
     WHERE id = $1`,
    [
      item.id, str(form, "title", 200) || item.title,
      pick(str(form, "format"), formats.map((f) => f.id), item.format),
      pick(str(form, "platform"), platforms, ""),
      str(form, "language", 60), str(form, "brief", 3000), str(form, "script", 20000),
      link(form, "video_url"), link(form, "published_url"), str(form, "internal_notes", 5000),
      date(form, "due_date"), date(form, "publish_on"), nextStage, str(form, "caption", 5000),
    ],
  );
  if (nextStage !== item.stage) await addEvent(item.id, TEAM, "stage", `Moved to ${stageOf(nextStage).client}.`);
  revalidatePath("/admin/content");
  redirect(`/admin/content/${item.id}?saved=1`);
}

export async function sendItemForReview(form: FormData) {
  await requireAdmin();
  const item = await getItem(Number(form.get("id")));
  if (!item) redirect("/admin/content");
  const kind = (str(form, "kind") === "video" ? "video" : "script") as Review;
  const error = await sendForReview(item, kind, TEAM);
  redirect(`/admin/content/${item.id}?${error ? `error=${encodeURIComponent(error)}` : `sent=${kind}`}`);
}

// A note to the client (shown in their history) or an internal note.
export async function addItemMessage(form: FormData) {
  await requireAdmin();
  const item = await getItem(Number(form.get("id")));
  const body = str(form, "body", 2000);
  if (!item) redirect("/admin/content");
  const internal = form.get("internal") === "on";
  if (body) await addEvent(item.id, TEAM, "message", body, internal);
  if (body && !internal) await notifyClientMessage(item, body);
  redirect(`/admin/content/${item.id}#history`);
}

// Posts an approved video now (or tries again after a failure) instead of waiting for its publish date.
export async function postItemNow(form: FormData) {
  const user = await requireAdmin();
  const item = await getItem(Number(form.get("id")));
  if (!item) redirect("/admin/content");
  if (!item.video_approved_at) redirect(`/admin/content/${item.id}?error=${encodeURIComponent("The client hasn't approved the video yet.")}`);
  after(() => publishContent(item.id, user.email));
  redirect(`/admin/content/${item.id}?posting=1#publishing`);
}

export async function deleteItem(form: FormData) {
  await requireAdmin();
  const item = await getItem(Number(form.get("id")));
  if (item) await query("DELETE FROM content_items WHERE id = $1", [item.id]);
  redirect(`/admin/content${item ? `?client=${item.client_slug}` : ""}`);
}

// ---- Client ----

async function clientItem(form: FormData) {
  const slug = str(form, "slug");
  const { user, client } = await requireClientAccess(slug);
  const item = await getItem(Number(form.get("id")));
  if (!item || item.client_id !== client.id) redirect(`/portal/c/${slug}/content`);
  return { user, item, base: `/portal/c/${slug}/content/${item.id}` };
}

export async function approveItem(form: FormData) {
  const { user, item, base } = await clientItem(form);
  const kind = await approve(item.id, user.email);
  if (kind) await notifyTeamOfClient(item, "approved", user.email, "", kind);
  // An approved video is posted to the client's connected accounts if its publish date has come.
  if (kind === "video") after(() => publishDue(undefined, item.id));
  const ok = Boolean(kind);
  revalidatePath(`/portal/c/${item.client_slug}`);
  redirect(`${base}?${ok ? "approved=1" : "error=already"}`);
}

export async function requestItemChanges(form: FormData) {
  const { user, item, base } = await clientItem(form);
  const comment = str(form, "comment", 3000);
  if (!comment) redirect(`${base}?error=comment#respond`);
  const kind = await requestChanges(item.id, user.email, comment);
  if (kind) await notifyTeamOfClient(item, "changes", user.email, `On the ${kind}: ${comment}`, kind);
  const ok = Boolean(kind);
  revalidatePath(`/portal/c/${item.client_slug}`);
  redirect(`${base}?${ok ? "changes=1" : "error=already"}`);
}

export async function commentOnItem(form: FormData) {
  const { user, item, base } = await clientItem(form);
  const body = str(form, "body", 2000);
  if (body) {
    await addEvent(item.id, user.email, "message", body);
    await notifyTeamOfClient(item, "message", user.email, body);
  }
  redirect(`${base}#history`);
}
