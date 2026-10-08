import { samples } from "@/lib/video/samples";
import { synthesize } from "@/lib/video/voice";

// Voice for the website's example videos. Only the fixed sample lines can be spoken, never visitor
// text, and the CDN keeps each file for a year (the URL changes when the line changes), so Sarvam is
// called about once per line per region, a few rupees in total.
const memory = new Map<string, Buffer>();

export async function GET(_req: Request, { params }: { params: Promise<{ sample: string; scene: string }> }) {
  const { sample, scene } = await params;
  const s = samples.find((x) => x.id === sample);
  const line = s?.scenes[Number(scene)];
  if (!s || !line || !/^\d+$/.test(scene)) return new Response("Not found", { status: 404 });

  const key = `${s.id}/${scene}|${s.voice.speaker}|${line.say}`;
  let audio = memory.get(key);
  if (!audio) {
    const res = await synthesize({ text: line.say, languageCode: s.voice.languageCode, speaker: s.voice.speaker });
    if (!res.ok) {
      console.error("Sample voice failed", s.id, scene, res.error);
      return new Response("Voice unavailable", { status: 503, headers: { "cache-control": "no-store" } });
    }
    audio = res.audio;
    memory.set(key, audio);
  }
  return new Response(new Uint8Array(audio), {
    headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=86400, s-maxage=31536000, immutable" },
  });
}
