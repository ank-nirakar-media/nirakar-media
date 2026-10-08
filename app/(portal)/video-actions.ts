"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { setSampleStatus } from "@/lib/video/requests";
import { resetVoiceChoice, saveVoiceChoice } from "@/lib/video/voice-settings";

export async function updateSampleRequest(form: FormData) {
  await requireAdmin();
  await setSampleStatus(Number(form.get("id")), String(form.get("status") ?? ""), String(form.get("note") ?? "").trim());
  revalidatePath("/admin/samples");
}

export async function saveVoice(form: FormData) {
  const user = await requireAdmin();
  const ok = await saveVoiceChoice(
    String(form.get("source") ?? ""),
    { model: String(form.get("model") ?? ""), speaker: String(form.get("speaker") ?? "").trim(), pace: Number(form.get("pace")) },
    user.email,
  );
  revalidatePath("/", "layout");
  redirect(ok ? "/admin/voices?saved=1" : "/admin/voices?error=1");
}

export async function resetVoice(form: FormData) {
  await requireAdmin();
  await resetVoiceChoice(String(form.get("source") ?? ""));
  revalidatePath("/", "layout");
  redirect("/admin/voices?saved=1");
}
