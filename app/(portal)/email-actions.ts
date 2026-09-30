"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { configuredSiteUrl } from "@/lib/site-url";

export async function sendTestEmail(form: FormData) {
  const user = await requireAdmin();
  const to = String(form.get("to") ?? "").trim() || user.email;
  if (!to.includes("@")) redirect("/admin/emails?test=bad");
  const status = await sendEmail({
    to,
    kind: "test",
    subject: "Test email from the Nirakar Media portal",
    heading: "Email is working",
    lines: ["This is a test from Admin > Emails. Clients will get approval requests, reminders and your messages in this format."],
    button: { label: "Open the portal", url: `${configuredSiteUrl() ?? "https://www.nirakarmedia.com"}/admin` },
  });
  redirect(`/admin/emails?test=${status}`);
}
