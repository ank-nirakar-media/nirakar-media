"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { one } from "@/lib/db";
import { draftScript, saveDraft, suggestIdeas } from "@/lib/ai/studio";
import { getItem } from "@/lib/pipeline";

const back = (path: string, error: string, key = "error") => `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(error)}`;

export async function aiSuggestIdeas(form: FormData) {
  await requireAdmin();
  const slug = String(form.get("client") ?? "");
  const client = await one<{ id: number }>("SELECT id FROM clients WHERE slug = $1", [slug]);
  const base = `/admin/content?client=${encodeURIComponent(slug)}`;
  if (!client) redirect(back("/admin/content", "Pick a client first.", "aierror"));
  const res = await suggestIdeas(client.id, Number(form.get("count")) || 6, String(form.get("focus") ?? "").trim().slice(0, 500));
  if (!res.ok) redirect(back(base, res.error, "aierror"));
  revalidatePath("/admin/content");
  redirect(`${base}&ideas=${res.data.length}`);
}

export async function aiDraftScript(form: FormData) {
  const user = await requireAdmin();
  const item = await getItem(Number(form.get("id")));
  if (!item) redirect("/admin/content");
  const path = `/admin/content/${item.id}`;
  if (item.review === "script") redirect(back(path, "The client is reviewing this script. Wait for their answer before redrafting."));
  if (item.script.trim() && form.get("replace") !== "on") redirect(back(path, "This item already has a script. Tick \"Replace the current script\" to redraft it."));
  const res = await draftScript(item.id);
  if (!res.ok) redirect(back(path, res.error));
  await saveDraft(item, res.data, user.email);
  redirect(`${path}?drafted=1#script`);
}
