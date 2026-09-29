import { NextResponse } from "next/server";
import { one, query } from "@/lib/db";
import { sha256 } from "@/lib/crypto";

// Tracked links (nirakarmedia.com/l/abc123) go in captions, bios and pinned
// comments. Each unique visitor per day counts as one lead, then we redirect.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const link = await one<{ client_id: number; video_id: number | null; target_url: string }>(
    "SELECT client_id, video_id, target_url FROM links WHERE code = $1",
    [code],
  );
  if (!link) return NextResponse.redirect(new URL("/", req.url));
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const visitor = sha256(`${ip}|${req.headers.get("user-agent") || ""}|${code}`).slice(0, 32);
  await query(
    "INSERT INTO leads (client_id, video_id, source, visitor) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
    [link.client_id, link.video_id, `link:${code}`, visitor],
  );
  return NextResponse.redirect(link.target_url, 302);
}
