import { NextResponse } from "next/server";
import { findSampleClips } from "@/lib/video/sample-clips";
import { samples } from "@/lib/video/samples";

// Background clips for one example video. The CDN keeps the answer for 24 hours (Pixabay requires it,
// and it keeps us far inside both rate limits).
export async function GET(_req: Request, { params }: { params: Promise<{ sample: string }> }) {
  const { sample } = await params;
  const s = samples.find((x) => x.id === sample);
  if (!s) return new Response("Not found", { status: 404 });
  try {
    const clips = await findSampleClips(s);
    return NextResponse.json({ clips }, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" } });
  } catch (err) {
    console.error("Sample footage failed", s.id, (err as Error).message);
    return NextResponse.json({ clips: [] }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
