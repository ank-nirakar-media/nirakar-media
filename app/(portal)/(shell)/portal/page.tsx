import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";

export default async function PortalHome() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");
  const client = await one<{ slug: string; onboarded: boolean }>(
    "SELECT c.slug, b.onboarded_at IS NOT NULL AS onboarded FROM clients c LEFT JOIN brand_profiles b ON b.client_id = c.id WHERE c.id = $1",
    [user.client_id],
  );
  if (!client) redirect("/login");
  // New clients go through setup first; they can skip to the dashboard at any time.
  redirect(client.onboarded ? `/portal/c/${client.slug}` : `/portal/c/${client.slug}/onboarding`);
}
