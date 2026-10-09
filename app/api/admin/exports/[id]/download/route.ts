import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { downloadUrl, getExport } from "@/lib/video/exports";

// Sends an admin to a fresh signed link for a finished export (the Blob store is private).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const row = /^\d+$/.test(id) ? await getExport(Number(id)) : undefined;
  if (row?.status !== "done" || !row.url) return new Response("Not ready", { status: 404 });
  const url = await downloadUrl(row.url);
  if (!url) return new Response("Couldn't make a download link. Check that the Blob store is connected.", { status: 502 });
  return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "no-store" } });
}
