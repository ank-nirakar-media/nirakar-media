import { voiceLine } from "@/lib/video/voices";
import { synthesize } from "@/lib/video/voice";

// Voice for the website's example videos and walkthrough. Only fixed lines can be spoken, never visitor
// text, and the CDN keeps each file for a year (the URL changes when the line changes), so Sarvam is
// called about once per line per region, a few rupees in total.
const memory = new Map<string, Buffer>();

export async function GET(_req: Request, { params }: { params: Promise<{ sample: string; scene: string }> }) {
  const { sample, scene } = await params;
  const line = /^\d+$/.test(scene) ? voiceLine(sample, Number(scene)) : undefined;
  if (!line) return new Response("Not found", { status: 404 });

  const key = `${line.languageCode}|${line.speaker}|${line.text}`;
  let audio = memory.get(key);
  if (!audio) {
    const res = await synthesize(line);
    if (!res.ok) {
      console.error("Sample voice failed", sample, scene, res.error);
      return new Response("Voice unavailable", { status: 503, headers: { "cache-control": "no-store" } });
    }
    audio = res.audio;
    memory.set(key, audio);
  }
  return new Response(new Uint8Array(audio), {
    headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=86400, s-maxage=31536000, immutable" },
  });
}
