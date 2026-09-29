import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";
import { connectInstagram } from "@/lib/connectors/instagram";
import { connectYoutube } from "@/lib/connectors/youtube";
import { syncConnections } from "@/lib/sync";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const base = siteUrl(req);
  const url = new URL(req.url);
  const jar = await cookies();
  const saved = JSON.parse(jar.get("nm_oauth")?.value || "{}") as { state?: string; slug?: string; provider?: string };
  jar.delete("nm_oauth");
  const back = `${base}/portal/c/${saved.slug ?? ""}/connections`;

  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${base}/login`);
  if (!saved.state || saved.state !== url.searchParams.get("state") || saved.provider !== provider) {
    return NextResponse.redirect(`${back}?error=${encodeURIComponent("The sign-in link expired. Please try again.")}`);
  }
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${back}?error=${encodeURIComponent("Access was not granted.")}`);

  const client = await one<{ id: number }>("SELECT id FROM clients WHERE slug = $1", [saved.slug]);
  if (!client || (user.role !== "admin" && user.client_id !== client.id)) return NextResponse.redirect(`${base}/portal`);

  try {
    const redirectUri = `${base}/api/connect/${provider}/callback`;
    const name = provider === "youtube" ? await connectYoutube(client.id, code, redirectUri) : await connectInstagram(client.id, code, redirectUri);
    await syncConnections(client.id);
    return NextResponse.redirect(`${back}?connected=${encodeURIComponent(name)}`);
  } catch (err) {
    console.error("Connect failed", err);
    const msg = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.redirect(`${back}?error=${encodeURIComponent(msg.slice(0, 200))}`);
  }
}
