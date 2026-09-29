import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";

export default async function PortalHome() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");
  const client = await one<{ slug: string }>("SELECT slug FROM clients WHERE id = $1", [user.client_id]);
  redirect(client ? `/portal/c/${client.slug}` : "/login");
}
