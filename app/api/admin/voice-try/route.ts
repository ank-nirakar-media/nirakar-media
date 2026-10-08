import { requireAdmin } from "@/lib/auth";
import { synthesize, validSpeaker, VOICE_MODELS } from "@/lib/video/voice";
import { voiceLine, type Part } from "@/lib/video/voices";

// Admin > Voices: reads one website voice source (its full script, or the first walkthrough line)
// in a chosen voice so the owner can compare voices by ear. Admins only; fixed text only.
const memory = new Map<string, Buffer>();

export async function GET(req: Request) {
  await requireAdmin();
  const q = new URL(req.url).searchParams;
  const source = q.get("source") ?? "";
  const model = q.get("model") ?? "";
  const speaker = (q.get("speaker") ?? "").trim();
  const pace = Math.min(2, Math.max(0.5, Number(q.get("pace")) || 1));
  const part: Part = source === "walkthrough" ? 0 : "full";
  const line = voiceLine(source, part, { model, speaker, pace });
  if (!line || !VOICE_MODELS.includes(model as (typeof VOICE_MODELS)[number]) || !validSpeaker(speaker)) {
    return new Response("Unknown source, model or speaker", { status: 400 });
  }
  const key = `${model}|${line.languageCode}|${speaker}|${pace}|${line.text}`;
  let audio = memory.get(key);
  if (!audio) {
    const res = await synthesize(line);
    if (!res.ok) return new Response(res.error, { status: 502, headers: { "cache-control": "no-store" } });
    audio = res.audio;
    memory.set(key, audio);
  }
  return new Response(new Uint8Array(audio), { headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=3600" } });
}
