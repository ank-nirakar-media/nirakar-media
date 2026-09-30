"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClientAccess } from "@/lib/auth";
import { readAnswers, saveAnswers, sections, steps } from "@/lib/brand";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// Onboarding: save one step's answers and move forward or back.
export async function saveOnboardingStep(form: FormData) {
  const slug = str(form, "slug");
  const { user, client } = await requireClientAccess(slug);
  const index = Math.max(0, Math.min(steps.length - 1, Number(form.get("step")) - 1 || 0));
  const step = steps[index];
  const nav = str(form, "nav");
  const base = `/portal/c/${slug}/onboarding`;

  if (nav === "finish") {
    await saveAnswers(client.id, {}, user.email, { step: steps.length, finished: true });
    revalidatePath(`/portal/c/${slug}`);
    redirect(`/portal/c/${slug}?welcome=1`);
  }
  const answers = nav === "skip" ? {} : readAnswers(form, step.fields);
  const next = nav === "back" ? index : index + 2; // 1-based step numbers
  await saveAnswers(client.id, answers, user.email, { step: nav === "back" ? index + 1 : next });
  redirect(`${base}?step=${Math.max(1, Math.min(steps.length, next))}`);
}

// Brand Brain page: save one section.
export async function saveBrandSection(form: FormData) {
  const slug = str(form, "slug");
  const { user, client } = await requireClientAccess(slug);
  const section = sections.find((s) => s.id === str(form, "section"));
  if (!section) redirect(`/portal/c/${slug}/brand`);
  await saveAnswers(client.id, readAnswers(form, section.fields), user.email);
  revalidatePath(`/portal/c/${slug}/brand`);
  redirect(`/portal/c/${slug}/brand?saved=${section.id}#${section.id}`);
}
