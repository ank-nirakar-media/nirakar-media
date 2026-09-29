import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { randomToken } from "@/lib/crypto";
import { siteUrl } from "@/lib/site-url";
import { metaAuthUrl, metaConfigured } from "@/lib/connectors/instagram";
import { youtubeAuthUrl, youtubeConfigured } from "@/lib/connectors/youtube";

// GET /api/connect/youtube/start?client=slug  (or /instagram/start)
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const base = siteUrl(req);
  const slug = new URL(req.url).searchParams.get("client") || "";
  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${base}/login`);
  const client = await one<{ id: number }>("SELECT id FROM clients WHERE slug = $1", [slug]);
  if (!client || (user.role !== "admin" && user.client_id !== client.id)) return NextResponse.redirect(`${base}/portal`);

  const back = `${base}/portal/c/${slug}/connections`;
  const redirectUri = `${base}/api/connect/${provider}/callback`;
  const state = randomToken(16);
  (await cookies()).set("nm_oauth", JSON.stringify({ state, slug, provider }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600, secure: base.startsWith("https") });

  if (provider === "youtube" && youtubeConfigured()) return NextResponse.redirect(youtubeAuthUrl(redirectUri, state));
  if (provider === "instagram" && metaConfigured()) return NextResponse.redirect(metaAuthUrl(redirectUri, state));
  return NextResponse.redirect(`${back}?error=${encodeURIComponent(`${provider} is not set up yet`)}`);
}
