"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { setSampleStatus } from "@/lib/video/requests";

export async function updateSampleRequest(form: FormData) {
  await requireAdmin();
  await setSampleStatus(Number(form.get("id")), String(form.get("status") ?? ""), String(form.get("note") ?? "").trim());
  revalidatePath("/admin/samples");
}
