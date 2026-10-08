// Every fixed line the website may speak: the example videos and the walkthrough narration.
// Visitor text is never sent to the voice provider.
import { samples } from "./samples";
import { walkScenes, walkVoice } from "./walkthrough";
import type { VoiceRequest } from "./voice";

export function voiceLine(source: string, index: number): VoiceRequest | undefined {
  if (source === "walkthrough") {
    const s = walkScenes[index];
    return s && { text: s.say, ...walkVoice };
  }
  const sample = samples.find((x) => x.id === source);
  const scene = sample?.scenes[index];
  return scene && sample && { text: scene.say, ...sample.voice };
}

// The URL for one line. The hash changes when the words or voice change, so the CDN never serves stale audio.
export function voiceUrl(source: string, index: number) {
  const l = voiceLine(source, index);
  return `/api/sample-voice/${source}/${index}?v=${hash(`${l?.languageCode}|${l?.speaker}|${l?.text}`)}`;
}

function hash(t: string) {
  let h = 5381;
  for (const c of t) h = ((h * 33) ^ c.codePointAt(0)!) >>> 0;
  return h.toString(36);
}
