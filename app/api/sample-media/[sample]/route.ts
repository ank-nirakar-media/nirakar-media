import { NextResponse } from "next/server";
import { pickClip, searchVideos } from "@/lib/video/footage";
import { estimateSeconds } from "@/lib/video/plan";
import { samples, type SampleClip } from "@/lib/video/samples";

// Background clips for one example video, chosen from Pexels by each scene's fixed search phrase.
// The CDN keeps the answer for six hours, which keeps us far inside Pexels' 200 searches an hour.
export async function GET(_req: Request, { params }: { params: Promise<{ sample: string }> }) {
  const { sample } = await params;
  const s = samples.find((x) => x.id === sample);
  if (!s) return new Response("Not found", { status: 404 });
  try {
    const used = new Set<number>();
    const clips: SampleClip[] = [];
    for (const scene of s.scenes) {
      const clip = pickClip(await searchVideos(scene.footage), estimateSeconds(scene.voiceover) + 1, used);
      if (clip) used.add(clip.id);
      clips.push(clip ? { src: clip.src, credit: clip.credit, pageUrl: clip.pageUrl } : null);
    }
    return NextResponse.json({ clips }, { headers: { "cache-control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400" } });
  } catch (err) {
    console.error("Sample footage failed", s.id, (err as Error).message);
    return NextResponse.json({ clips: [] }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
