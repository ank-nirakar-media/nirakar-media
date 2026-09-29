"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, destroySession, requireAdmin, requireClientAccess } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { timingSafeEqual } from "node:crypto";
import { hashPassword, randomToken, sha256, verifyPassword } from "@/lib/crypto";
import { syncConnections } from "@/lib/sync";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function login(form: FormData) {
  const email = str(form, "email").toLowerCase();
  const user = await one<{ id: number; password_hash: string | null }>("SELECT id, password_hash FROM users WHERE email = $1", [email]);
  if (!user || !verifyPassword(str(form, "password"), user.password_hash)) redirect("/login?error=1");
  await createSession(user.id);
  redirect("/portal");
}

// One-time: create the first admin on a fresh database (see /setup).
export async function createFirstAdmin(form: FormData) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) redirect("/setup?error=config");
  if (await one("SELECT id FROM users WHERE role = 'admin' LIMIT 1")) redirect("/login");
  const key = Buffer.from(str(form, "key"));
  const want = Buffer.from(secret);
  if (key.length !== want.length || !timingSafeEqual(key, want)) redirect("/setup?error=key");
  const email = str(form, "email").toLowerCase();
  const password = str(form, "password");
  if (!email.includes("@") || password.length < 10) redirect("/setup?error=input");
  const user = await one<{ id: number }>(
    "INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, 'admin', $3) RETURNING id",
    [email, str(form, "name") || "Admin", hashPassword(password)],
  );
  await createSession(user!.id);
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function setPassword(form: FormData) {
  const token = str(form, "token");
  const password = str(form, "password");
  if (password.length < 10) redirect(`/set-password?token=${encodeURIComponent(token)}&error=short`);
  const user = await one<{ id: number }>(
    "SELECT id FROM users WHERE invite_hash = $1 AND invite_expires > now()",
    [sha256(token)],
  );
  if (!user) redirect("/set-password?error=expired");
  await query("UPDATE users SET password_hash = $1, invite_hash = NULL, invite_expires = NULL WHERE id = $2", [hashPassword(password), user.id]);
  await createSession(user.id);
  redirect("/portal");
}

// ---- Admin ----

export async function createClient(form: FormData) {
  await requireAdmin();
  const name = str(form, "name");
  const slug = (str(form, "slug") || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const plan = str(form, "plan");
  if (!name || !slug || !["starter", "growth", "pro"].includes(plan)) redirect("/admin?error=client");
  const exists = await one("SELECT 1 FROM clients WHERE slug = $1", [slug]);
  if (exists) redirect("/admin?error=slug");
  await query("INSERT INTO clients (slug, name, plan, languages, lead_key) VALUES ($1, $2, $3, $4, $5)", [
    slug, name, plan, str(form, "languages") || "English", randomToken(18),
  ]);
  redirect(`/admin/c/${slug}`);
}

export async function updateClient(form: FormData) {
  await requireAdmin();
  const slug = str(form, "slug");
  const plan = str(form, "plan");
  if (!["starter", "growth", "pro"].includes(plan)) redirect(`/admin/c/${slug}`);
  await query("UPDATE clients SET plan = $1, languages = $2 WHERE slug = $3", [plan, str(form, "languages") || "English", slug]);
  revalidatePath(`/admin/c/${slug}`);
}

// Creates (or re-invites) a login and shows the one-time set-password link to the admin.
export async function inviteUser(form: FormData) {
  await requireAdmin();
  const slug = str(form, "slug");
  const email = str(form, "email").toLowerCase();
  const role = str(form, "role") === "admin" ? "admin" : "client";
  const client = await one<{ id: number }>("SELECT id FROM clients WHERE slug = $1", [slug]);
  if (!email.includes("@") || (role === "client" && !client)) redirect(`/admin/c/${slug}?error=invite`);
  const token = randomToken(24);
  const expires = new Date(Date.now() + 7 * 864e5);
  await query(
    `INSERT INTO users (email, name, role, client_id, invite_hash, invite_expires) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE SET invite_hash = EXCLUDED.invite_hash, invite_expires = EXCLUDED.invite_expires`,
    [email, str(form, "name"), role, role === "client" ? client!.id : null, sha256(token), expires],
  );
  redirect(`/admin/c/${slug}?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
}

export async function addOpportunity(form: FormData) {
  await requireAdmin();
  const slug = str(form, "slug");
  const client = await one<{ id: number }>("SELECT id FROM clients WHERE slug = $1", [slug]);
  if (!client || !str(form, "signal") || !str(form, "action")) redirect(`/admin/c/${slug}?error=opportunity`);
  await query("INSERT INTO opportunities (client_id, signal, location, action, published) VALUES ($1, $2, $3, $4, $5)", [
    client.id, str(form, "signal"), str(form, "location"), str(form, "action"), form.get("publish") === "on",
  ]);
  revalidatePath(`/admin/c/${slug}`);
}

export async function setOpportunity(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const op = str(form, "op");
  if (op === "delete") await query("DELETE FROM opportunities WHERE id = $1", [id]);
  else await query("UPDATE opportunities SET published = $1 WHERE id = $2", [op === "publish", id]);
  revalidatePath(`/admin/c/${str(form, "slug")}`);
}

export async function createLink(form: FormData) {
  await requireAdmin();
  const slug = str(form, "slug");
  const target = str(form, "target");
  const client = await one<{ id: number }>("SELECT id FROM clients WHERE slug = $1", [slug]);
  if (!client || !/^https?:\/\//.test(target) || !str(form, "label")) redirect(`/admin/c/${slug}?error=link`);
  const videoId = Number(form.get("video")) || null;
  await query("INSERT INTO links (code, client_id, video_id, label, target_url) VALUES ($1, $2, $3, $4, $5)", [
    randomToken(5).replace(/[-_]/g, "x"), client.id, videoId, str(form, "label"), target,
  ]);
  revalidatePath(`/admin/c/${slug}`);
}

export async function tagVideo(form: FormData) {
  await requireAdmin();
  await query("UPDATE videos SET topic = NULLIF($1, ''), language = NULLIF($2, '') WHERE id = $3", [
    str(form, "topic"), str(form, "language"), Number(form.get("id")),
  ]);
  revalidatePath(`/admin/c/${str(form, "slug")}`);
}

// ---- Client or admin ----

export async function syncNow(form: FormData) {
  const { client } = await requireClientAccess(str(form, "slug"));
  await syncConnections(client.id);
  redirect(`/portal/c/${client.slug}/connections?synced=1`);
}

export async function disconnect(form: FormData) {
  const { client } = await requireClientAccess(str(form, "slug"));
  await query(
    "UPDATE connections SET status = 'disconnected', access_token = NULL, refresh_token = NULL WHERE id = $1 AND client_id = $2",
    [Number(form.get("id")), client.id],
  );
  redirect(`/portal/c/${client.slug}/connections`);
}
