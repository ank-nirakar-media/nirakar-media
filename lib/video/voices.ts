// Every fixed line the website may speak: the example videos and the walkthrough narration.
// Visitor text is never sent to the voice provider.
import { fullSay, samples } from "./samples";
import type { VoiceRequest } from "./voice";
import type { VoiceChoice } from "./voice-settings";
import { walkScenes, walkVoice } from "./walkthrough";

export const voiceSources = [
  // Example Shorts are read in one take ("full"), so pace and tone stay even across lines.
  ...samples.map((s) => ({ id: s.id, label: `${s.niche} example (${s.language})`, languageCode: s.voice.languageCode, speaker: s.voice.speaker, lines: s.scenes.map((x) => x.say), full: fullSay(s) })),
  // The walkthrough is read scene by scene: its animations need the pauses between them.
  { id: "walkthrough", label: "Walkthrough narration (English)", languageCode: walkVoice.languageCode, speaker: walkVoice.speaker, lines: walkScenes.map((x) => x.say), full: undefined as string | undefined },
];

export type Part = number | "full";

export function voiceLine(source: string, part: Part, choice?: VoiceChoice): VoiceRequest | undefined {
  const src = voiceSources.find((x) => x.id === source);
  const text = part === "full" ? src?.full : src?.lines[part];
  if (!src || text === undefined) return undefined;
  return { text, languageCode: src.languageCode, speaker: choice?.speaker ?? src.speaker, model: choice?.model, pace: choice?.pace };
}

// The URL for one line. The hash covers the words and default voice; key covers choices made in admin.
export function voiceUrl(source: string, part: Part, key = "d") {
  const l = voiceLine(source, part);
  return `/api/sample-voice/${source}/${part}?v=${hash(`${l?.languageCode}|${l?.speaker}|${l?.text}`)}&s=${key}`;
}

function hash(t: string) {
  let h = 5381;
  for (const c of t) h = ((h * 33) ^ c.codePointAt(0)!) >>> 0;
  return h.toString(36);
}
