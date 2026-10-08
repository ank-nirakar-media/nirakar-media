// Example videos for the website demo. The businesses are made up and labelled as examples on the page.
// Scripts follow our own rules: no invented prices, results or statistics.
import { planFromScenes, type SceneInput } from "./build";
import type { Brand, Layout, VideoPlan } from "./plan";

export type Sample = { id: string; niche: string; language: string; layout: Layout; brand: Brand; scenes: SceneInput[] };

export const samples: Sample[] = [
  {
    id: "dental",
    niche: "Dental clinic",
    language: "Hinglish",
    layout: "bold",
    brand: { name: "Smile Dental Clinic", primary: "#8B5CF6", accent: "#D08BFF", handle: "@smiledental" },
    scenes: [
      { voiceover: "Daant mein dard? Ise ignore mat kijiye.", on_screen_text: "Tooth pain?" },
      { voiceover: "Aaj ki chhoti cavity, kal ka root canal ban sakti hai.", on_screen_text: "Small today, big tomorrow" },
      { voiceover: "Saal mein do baar checkup karwaiye.", on_screen_text: "Checkup twice a year" },
      { voiceover: "Smile Dental Clinic. Aaj hi appointment book kijiye.", on_screen_text: "Book today" },
    ],
  },
  {
    id: "cafe",
    niche: "Café",
    language: "Hindi",
    layout: "clean",
    brand: { name: "Chai Adda", primary: "#C2410C", accent: "#FCD34D", handle: "@chaiadda" },
    scenes: [
      { voiceover: "बारिश हो रही है? तो चाय तो बनती है।", on_screen_text: "बारिश + चाय" },
      { voiceover: "अदरक वाली, इलायची वाली, या मसाला चाय।", on_screen_text: "आपकी पसंद कौन सी?" },
      { voiceover: "दोस्तों को टैग कीजिए और आज शाम मिलिए।", on_screen_text: "आज शाम मिलते हैं" },
      { voiceover: "चाय अड्डा। हर कप में घर जैसा स्वाद।", on_screen_text: "Chai Adda" },
    ],
  },
  {
    id: "ca",
    niche: "Tax consultant",
    language: "English",
    layout: "stack",
    brand: { name: "Sharma Tax Desk", primary: "#0F766E", accent: "#5EEAD4", handle: "@sharmataxdesk" },
    scenes: [
      { voiceover: "Filing your income tax return this year?", on_screen_text: "ITR season" },
      { voiceover: "Keep your Form 16, bank statements and investment proofs ready.", on_screen_text: "3 documents to keep ready" },
      { voiceover: "Check your AIS on the income tax portal before you file.", on_screen_text: "Check your AIS first" },
      { voiceover: "Questions? Message Sharma Tax Desk today.", on_screen_text: "Message us" },
    ],
  },
];

export const WATERMARK = "Sample by Nirakar Media";

export function samplePlan(s: Sample, brand?: Brand): VideoPlan {
  const b = brand ?? s.brand;
  // A visitor's own business name replaces the example name in the spoken lines too.
  const scenes = brand ? s.scenes.map((x) => ({ ...x, voiceover: x.voiceover.replaceAll(s.brand.name, b.name), on_screen_text: x.on_screen_text.replaceAll(s.brand.name, b.name) })) : s.scenes;
  return planFromScenes({ scenes, brand: b, language: s.language, layout: s.layout, watermark: WATERMARK });
}
