import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, query } from "./db";
import { randomToken, sha256 } from "./crypto";

export const SESSION_COOKIE = "nm_session";
const SESSION_DAYS = 30;

export type User = { id: number; email: string; name: string; role: "admin" | "client"; client_id: number | null };
export type Client = { id: number; slug: string; name: string; plan: "starter" | "growth" | "pro"; languages: string; lead_key: string };

export async function createSession(userId: number) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [sha256(token), userId, expires]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !process.env.INSECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await one<User>(
    `SELECT u.id, u.email, u.name, u.role, u.client_id FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
  return user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/portal");
  return user;
}

// A client user may only open their own workspace; admins may open any.
export async function requireClientAccess(slug: string): Promise<{ user: User; client: Client }> {
  const user = await requireUser();
  const client = await one<Client>("SELECT id, slug, name, plan, languages, lead_key FROM clients WHERE slug = $1", [slug]);
  if (!client || (user.role !== "admin" && user.client_id !== client.id)) redirect("/portal");
  return { user, client };
}
