import { after, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listPublications, publishExport, type Platform } from "@/lib/publish";

// Admin > Exports: posts a finished MP4 to Nirakar Media's own YouTube and Instagram. Uploading and
// Instagram's processing take a minute or two, so posting runs after the response.
export const maxDuration = 300;

const exportId = async (params: Promise<{ id: string }>) => {
  const { id } = await params;
  return /^\d+$/.test(id) ? Number(id) : undefined;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const id = await exportId(params);
  const body = (await req.json().catch(() => ({}))) as { platforms?: string[]; title?: string; caption?: string };
  const platforms = (body.platforms ?? []).filter((p): p is Platform => p === "youtube" || p === "instagram");
  const title = String(body.title ?? "").trim().slice(0, 100);
  if (!id || !platforms.length || !title) return NextResponse.json({ error: "Pick at least one platform and add a title." }, { status: 400 });
  const res = await publishExport(id, { platforms, title, caption: String(body.caption ?? "").slice(0, 2200), by: user.email });
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
  after(res.run);
  return NextResponse.json({ ids: res.ids });
}

// Polled while posting runs.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = await exportId(params);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await listPublications("export", [id]), { headers: { "cache-control": "no-store" } });
}
