// Turns an AI scene plan (lib/ai/studio.ts) into a VideoPlan the renderer can play.
// Pure functions: no network, so the same code builds website previews, admin previews and real renders.
import { estimateSeconds, layoutFor, timeWords, type Brand, type Layout, type PlanScene, type Visual, type VideoPlan } from "./plan";

export type SceneInput = { voiceover: string; on_screen_text: string; seconds?: number; audioSrc?: string; audioSec?: number; media?: Visual };

export const defaultBrand: Brand = { name: "Your Business", primary: "#8B5CF6", accent: "#D08BFF" };

export function planFromScenes(o: {
  scenes: SceneInput[];
  brand: Brand;
  language: string;
  layout?: Layout;
  seed?: number; // picks the layout when none is given, usually the content item id
  watermark?: string;
}): VideoPlan {
  const scenes: PlanScene[] = o.scenes
    .filter((s) => s.voiceover.trim() || s.on_screen_text.trim())
    .map((s) => {
      // Real audio length wins. Without audio, estimate from the words so captions still read naturally.
      const durationSec = s.audioSec ?? estimateSeconds(s.voiceover);
      return {
        durationSec,
        audioSrc: s.audioSrc,
        visual: s.media ?? { kind: "color" },
        words: timeWords(s.voiceover, durationSec),
        onScreenText: s.on_screen_text.trim(),
      };
    });
  return {
    version: 1,
    fps: 30,
    width: 1080,
    height: 1920,
    language: o.language,
    layout: o.layout ?? layoutFor(o.seed ?? 0),
    brand: o.brand,
    scenes,
    watermark: o.watermark,
  };
}

const HEX = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi;

// Brand colours from the Brand Brain's free-text "colours and fonts" answer, e.g. "#2E1065 purple, #F59E0B amber".
// The first hex code is the main colour, the second the highlight. Falls back to Nirakar purple.
export function brandColors(text: string): Pick<Brand, "primary" | "accent"> {
  const found = (text.match(HEX) ?? []).map(expandHex);
  const primary = found[0] ?? defaultBrand.primary;
  return { primary, accent: found[1] ?? lighten(primary) };
}

function expandHex(h: string) {
  const x = h.slice(1);
  return ("#" + (x.length === 3 ? [...x].map((c) => c + c).join("") : x)).toUpperCase();
}

function lighten(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.45);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Accepts only a 6-digit hex colour from a visitor's colour picker. Anything else falls back.
export function safeColor(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fallback;
}
