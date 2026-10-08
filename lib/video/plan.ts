// The video plan: everything a renderer needs to make one finished Short, in a neutral format.
// The engine builds a plan from Claude's scenes, voice audio and chosen clips, saves it in Neon,
// and any renderer (Remotion today) turns it into an MP4. Changing renderer only changes that last step.

export const LAYOUTS = ["bold", "clean", "stack"] as const;
export type Layout = (typeof LAYOUTS)[number];

export type Word = { text: string; start: number; end: number }; // seconds from the start of the scene

export type Visual =
  | { kind: "video"; src: string; credit: string; license: string }
  | { kind: "image"; src: string; credit: string; license: string }
  | { kind: "color" }; // brand gradient, used when nothing else fits

export type PlanScene = {
  durationSec: number;
  audioSrc?: string;
  visual: Visual;
  words: Word[];
  onScreenText: string;
};

export type Brand = { name: string; primary: string; accent: string; logoSrc?: string; handle?: string };

export type VideoPlan = {
  version: 1;
  fps: 30;
  width: number;
  height: number;
  language: string;
  layout: Layout;
  brand: Brand;
  scenes: PlanScene[];
  music?: { src: string; volume: number; credit: string; license: string };
  voiceover?: { src: string }; // one continuous take for the whole video (scenes then carry no audioSrc)
  watermark?: string; // shown across demo samples, empty for client videos
};

export const FPS = 30;

export function planFrames(plan: Pick<VideoPlan, "scenes">): number {
  return Math.max(1, plan.scenes.reduce((n, s) => n + sceneFrames(s), 0));
}

export function sceneFrames(scene: Pick<PlanScene, "durationSec">): number {
  return Math.max(1, Math.round(scene.durationSec * FPS));
}

// Caption timings from the script itself. Voice providers like Sarvam return audio without word
// timestamps, but we know the exact words and the audio length, so each word gets a share of the
// time in proportion to its length, with a small extra pause after punctuation.
export function timeWords(text: string, durationSec: number, lead = 0.15, tail = 0.25): Word[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length || durationSec <= 0) return [];
  const span = Math.max(0.1, durationSec - lead - tail);
  const weight = (t: string) => Math.max(2, [...t.replace(/[^\p{L}\p{N}]/gu, "")].length) + (/[.,!?;:।]$/.test(t) ? 3 : 0);
  const total = tokens.reduce((n, t) => n + weight(t), 0);
  const words: Word[] = [];
  let at = lead;
  for (const t of tokens) {
    const len = (weight(t) / total) * span;
    words.push({ text: t, start: round(at), end: round(at + len) });
    at += len;
  }
  return words;
}

// Groups words into short caption lines (about three words or 16 characters), the way Shorts captions read best.
export function captionGroups(words: Word[], maxWords = 3, maxChars = 16): Word[][] {
  const groups: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    if (cur.length && (cur.length >= maxWords || chars > maxChars)) {
      groups.push(cur);
      cur = [];
    }
    cur.push(w);
    if (/[.!?।]$/.test(w.text)) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);
  return groups;
}

// Splits one continuous voice take across scenes in proportion to how much each scene says (letters,
// plus a beat for sentence-ending punctuation), so scene changes land near the real pauses.
export function splitTake(lines: string[], seconds: number): number[] {
  const weight = (t: string) => Math.max(1, [...t.replace(/[^\p{L}\p{N}]/gu, "")].length) + (t.match(/[.!?।]/g)?.length ?? 0) * 4;
  const total = lines.reduce((n, l) => n + weight(l), 0);
  return lines.map((l) => Math.round((weight(l) / total) * seconds * 100) / 100);
}

// Spoken length estimate for a line when no audio exists yet (previews, tests): about 2.6 words a second.
export function estimateSeconds(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round((words / 2.6 + 0.6) * 10) / 10);
}

// The same client should not see the same layout every time. Picks a layout from a seed (the content item id).
export function layoutFor(seed: number): Layout {
  return LAYOUTS[Math.abs(Math.trunc(seed)) % LAYOUTS.length];
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
