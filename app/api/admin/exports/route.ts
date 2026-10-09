import { after, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { siteUrl } from "@/lib/site-url";
import { createExport, startExport } from "@/lib/video/exports";

// Admin > Exports: starts an MP4 render of one website demo. Setting up the render sandbox takes a few
// minutes, so it runs after the response, inside this function's long time limit.
export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await requireAdmin();
  const { source } = (await req.json().catch(() => ({}))) as { source?: string };
  const id = await createExport(String(source ?? ""), user.email);
  if (!id) return NextResponse.json({ error: "Unknown video" }, { status: 400 });
  const site = siteUrl(req);
  after(() => startExport(id, site));
  return NextResponse.json({ id });
}
