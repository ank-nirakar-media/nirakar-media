import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { refreshExport } from "@/lib/video/exports";

// Admin > Exports polls this while a render runs.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const row = /^\d+$/.test(id) ? await refreshExport(Number(id)) : undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row, { headers: { "cache-control": "no-store" } });
}
