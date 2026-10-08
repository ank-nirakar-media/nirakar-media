// Example videos for the website demo. The businesses are made up and labelled as examples on the page.
// Scripts follow our own rules: no invented prices, results or statistics.
import { planFromScenes, type SceneInput } from "./build";
import type { Brand, Layout, VideoPlan } from "./plan";

// say: what the voice reads. Hinglish captions stay in Roman script, the voice gets Devanagari (Sarvam reads it better).
// Spoken lines never include the business name, so the voice still fits when a visitor types their own name.
export type SampleScene = SceneInput & { say: string };
export type Sample = { id: string; niche: string; language: string; voice: { languageCode: string; speaker: string }; layout: Layout; brand: Brand; scenes: SampleScene[] };

export const samples: Sample[] = [
  {
    id: "dental",
    niche: "Dental clinic",
    language: "Hinglish",
    voice: { languageCode: "hi-IN", speaker: "priya" },
    layout: "bold",
    brand: { name: "Smile Dental Clinic", primary: "#8B5CF6", accent: "#D08BFF", handle: "@smiledental" },
    scenes: [
      { voiceover: "Daant mein dard? Ise ignore mat kijiye.", say: "दाँत में दर्द? इसे इग्नोर मत कीजिए।", on_screen_text: "Tooth pain?" },
      { voiceover: "Aaj ki chhoti cavity, kal ka root canal ban sakti hai.", say: "आज की छोटी कैविटी, कल का रूट कैनाल बन सकती है।", on_screen_text: "Small today, big tomorrow" },
      { voiceover: "Saal mein do baar checkup karwaiye.", say: "साल में दो बार चेकअप करवाइए।", on_screen_text: "Checkup twice a year" },
      { voiceover: "Aaj hi appointment book kijiye.", say: "आज ही अपॉइंटमेंट बुक कीजिए।", on_screen_text: "Book today" },
    ],
  },
  {
    id: "cafe",
    niche: "Café",
    language: "Hindi",
    voice: { languageCode: "hi-IN", speaker: "shubh" },
    layout: "clean",
    brand: { name: "Chai Adda", primary: "#C2410C", accent: "#FCD34D", handle: "@chaiadda" },
    scenes: [
      { voiceover: "बारिश हो रही है? तो चाय तो बनती है।", say: "बारिश हो रही है? तो चाय तो बनती है।", on_screen_text: "बारिश + चाय" },
      { voiceover: "अदरक वाली, इलायची वाली, या मसाला चाय।", say: "अदरक वाली, इलायची वाली, या मसाला चाय।", on_screen_text: "आपकी पसंद कौन सी?" },
      { voiceover: "दोस्तों को टैग कीजिए और आज शाम मिलिए।", say: "दोस्तों को टैग कीजिए और आज शाम मिलिए।", on_screen_text: "आज शाम मिलते हैं" },
      { voiceover: "हर कप में घर जैसा स्वाद।", say: "हर कप में घर जैसा स्वाद।", on_screen_text: "Chai Adda" },
    ],
  },
  {
    id: "ca",
    niche: "Tax consultant",
    language: "English",
    voice: { languageCode: "en-IN", speaker: "rohan" },
    layout: "stack",
    brand: { name: "Sharma Tax Desk", primary: "#0F766E", accent: "#5EEAD4", handle: "@sharmataxdesk" },
    scenes: [
      { voiceover: "Filing your income tax return this year?", say: "Filing your income tax return this year?", on_screen_text: "ITR season" },
      { voiceover: "Keep your Form 16, bank statements and investment proofs ready.", say: "Keep your Form 16, bank statements and investment proofs ready.", on_screen_text: "3 documents to keep ready" },
      { voiceover: "Check your AIS on the income tax portal before you file.", say: "Check your A I S on the income tax portal before you file.", on_screen_text: "Check your AIS first" },
      { voiceover: "Questions? Message us today.", say: "Questions? Message us today.", on_screen_text: "Message us" },
    ],
  },
];

export const WATERMARK = "Sample by Nirakar Media";

// Real voice lengths per scene, in seconds, once the voice files have loaded in the browser.
export type VoiceTrack = { src: string; seconds: number }[];

export function samplePlan(s: Sample, brand?: Brand, voice?: VoiceTrack): VideoPlan {
  const b = brand ?? s.brand;
  const scenes = s.scenes.map((x, i) => ({
    voiceover: x.voiceover,
    on_screen_text: brand ? x.on_screen_text.replaceAll(s.brand.name, b.name) : x.on_screen_text,
    ...(voice?.[i] ? { audioSrc: voice[i].src, audioSec: voice[i].seconds + 0.35 } : {}),
  }));
  return planFromScenes({ scenes, brand: b, language: s.language, layout: s.layout, watermark: WATERMARK });
}

// The voice file for one scene. The hash changes when the line or voice changes, so cached audio is never stale.
export function sampleVoiceUrl(s: Sample, scene: number) {
  const x = s.scenes[scene];
  return `/api/sample-voice/${s.id}/${scene}?v=${hash(`${s.voice.languageCode}|${s.voice.speaker}|${x.say}`)}`;
}

function hash(t: string) {
  let h = 5381;
  for (const c of t) h = ((h * 33) ^ c.codePointAt(0)!) >>> 0;
  return h.toString(36);
}
