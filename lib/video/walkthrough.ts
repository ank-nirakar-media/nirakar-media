// The narrated product walkthrough on the website: how one video gets made, approved, published and
// tracked. Every claim matches what the service does today (see docs/architecture.md); the dashboard
// numbers in it are examples and the video says so on screen.
import { estimateSeconds } from "./plan";

export type WalkScene = { id: "intro" | "brand" | "script" | "video" | "approve" | "publish" | "dashboard" | "cta"; say: string; caption: string };

export const walkVoice = { languageCode: "en-IN", speaker: "shubh" };

export const walkScenes: WalkScene[] = [
  { id: "intro", say: "You run your business. Nirakar Media runs your content engine. Here is how one video gets made.", caption: "How one video gets made" },
  { id: "brand", say: "First, we learn your business: your offer, your customers, and the language they speak.", caption: "1. We learn your business" },
  { id: "script", say: "Our AI writes the script from that, and a person on our team checks every line.", caption: "2. AI writes, a person checks" },
  { id: "video", say: "Then the engine makes the video, with an Indian voice, stock footage, and captions in your brand colours.", caption: "3. The engine makes the video" },
  { id: "approve", say: "You approve it from your phone. If you are busy, it approves itself after forty eight hours.", caption: "4. You approve it" },
  { id: "publish", say: "We publish it on YouTube and Instagram, on your content calendar.", caption: "5. We publish it" },
  { id: "dashboard", say: "And your dashboard shows what every video did: views, engagement, and the leads it brought in.", caption: "6. You see the results" },
  { id: "cta", say: "Get a free sample video for your business at nirakar media dot com.", caption: "Get a free sample" },
];

// Scene lengths: the narration plus a beat for the animation, or an estimate when there is no audio.
export function walkDurations(audioSec?: (number | undefined)[]): number[] {
  return walkScenes.map((s, i) => Math.round(((audioSec?.[i] ?? estimateSeconds(s.say)) + 0.8) * 30) / 30);
}
