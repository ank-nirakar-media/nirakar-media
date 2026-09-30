// Brand Brain: everything the team needs to know about a client to plan and make
// their content. Onboarding fills it step by step; the Brand Brain page edits it.
// Questions live in `fields`; answers are stored as JSON in brand_profiles.data.
import { languages as coreLanguages, moreLanguages } from "./plans";
import { one, query } from "./db";

type Kind = "text" | "url" | "textarea" | "select" | "checks";
export type Field = {
  key: string;
  label: string;
  kind: Kind;
  hint?: string;
  placeholder?: string;
  options?: string[];
  groups?: { label: string; options: string[] }[];
};

export const businessTypes = [
  { label: "Creators", options: ["YouTuber or creator", "Faceless channel", "Multi-channel operator"] },
  { label: "Brands", options: ["D2C brand", "Startup or founder", "Agency"] },
  { label: "Businesses", options: ["Local business", "Coach or educator", "Professional services", "Other"] },
];

export const fields: Record<string, Field> = {
  business_type: { key: "business_type", label: "What best describes you?", kind: "select", groups: businessTypes },
  website: { key: "website", label: "Website", kind: "url", placeholder: "https://" },
  about: { key: "about", label: "What do you do, in a few sentences?", kind: "textarea", placeholder: "We make cold-pressed hair oils in Kerala and sell online across India." },
  channels: {
    key: "channels", label: "Other channels and handles", kind: "textarea",
    hint: "LinkedIn, Facebook Page, X, WhatsApp Business, anything we should post to or learn from.",
    placeholder: "Facebook: facebook.com/yourpage\nLinkedIn: linkedin.com/company/you",
  },
  audience: { key: "audience", label: "Who are your customers?", kind: "textarea", placeholder: "Women 22 to 40 in metro cities who care about natural ingredients and buy on Instagram." },
  offerings: { key: "offerings", label: "What do you sell, and at what price?", kind: "textarea", placeholder: "Hair oil 200ml ₹549, combo pack ₹999, free shipping above ₹799." },
  tone: {
    key: "tone", label: "How should you sound?", kind: "checks",
    options: ["Friendly", "Expert", "Bold", "Calm", "Funny", "Premium", "Inspiring", "Straight-talking", "Desi and local", "Youthful"],
  },
  tone_notes: { key: "tone_notes", label: "Anything else about your voice?", kind: "textarea", placeholder: "Use Hinglish. Never sound salesy. Say 'you' not 'users'." },
  logo_url: { key: "logo_url", label: "Logo", kind: "url", hint: "A link to your logo file (Google Drive, Dropbox or your website).", placeholder: "https://drive.google.com/..." },
  brand_guide_url: { key: "brand_guide_url", label: "Brand guide or style sheet", kind: "url", placeholder: "https://" },
  assets_folder_url: { key: "assets_folder_url", label: "Folder with photos, product shots or footage", kind: "url", hint: "Share it so anyone with the link can view.", placeholder: "https://drive.google.com/drive/folders/..." },
  colors_fonts: { key: "colors_fonts", label: "Brand colours and fonts", kind: "text", placeholder: "#2E1065 purple, #F59E0B amber, Poppins" },
  references: { key: "references", label: "Videos or channels you like", kind: "textarea", hint: "Links to content whose style you want. One per line.", placeholder: "https://youtube.com/@..." },
  goals: {
    key: "goals", label: "What do you want content to do for you?", kind: "checks",
    options: ["Grow followers", "Get leads and enquiries", "Sell products online", "Build authority", "Earn ad revenue", "Launch something new", "Hire or build a team"],
  },
  success: { key: "success", label: "What would success look like in 3 months?", kind: "textarea", placeholder: "50 WhatsApp enquiries a month, 10k Instagram followers." },
  competitors: { key: "competitors", label: "Competitors or channels you compete with", kind: "textarea", hint: "One per line, with a link if you have it.", placeholder: "https://instagram.com/competitor" },
  pillars: { key: "pillars", label: "Content pillars", kind: "textarea", hint: "The 3 to 5 themes your content keeps coming back to. We'll suggest these if you leave it blank.", placeholder: "Hair care myths\nIngredient stories\nCustomer transformations" },
  ctas: { key: "ctas", label: "Calls to action", kind: "textarea", hint: "What viewers should do next, and where.", placeholder: "Order on WhatsApp: wa.me/91...\nShop: yoursite.com/shop" },
  languages: { key: "languages", label: "Content languages", kind: "checks", options: [...coreLanguages, ...moreLanguages] },
  compliance: {
    key: "compliance", label: "Rules we must follow", kind: "textarea",
    hint: "Claims to avoid, required disclaimers, topics that are off limits, industry rules (health, finance, legal).",
    placeholder: "Don't claim it cures hair fall. Always say 'results vary'.",
  },
};

export type StepId = "business" | "channels" | "voice" | "assets" | "goals" | "review";
export const steps: { id: StepId; title: string; intro: string; fields: string[] }[] = [
  { id: "business", title: "Your business", intro: "Tell us who you are so we research the right niche.", fields: ["business_type", "website", "about"] },
  { id: "channels", title: "Your channels", intro: "Connect YouTube and Instagram so your dashboard fills in by itself, and list anywhere else you post.", fields: ["channels"] },
  { id: "voice", title: "Audience and voice", intro: "Who you're talking to and how you should sound.", fields: ["audience", "offerings", "tone", "tone_notes", "languages"] },
  { id: "assets", title: "Brand assets", intro: "Share links to your logo and brand files. Google Drive or Dropbox links work.", fields: ["logo_url", "brand_guide_url", "assets_folder_url", "colors_fonts", "references"] },
  { id: "goals", title: "Goals", intro: "What content should achieve for you. Your first content plan is built around this.", fields: ["goals", "success"] },
  { id: "review", title: "Review your plan", intro: "Check your plan and finish. You can change any answer later in Brand Brain.", fields: [] },
];

// Brand Brain page sections, in the order of the product blueprint.
export const sections: { id: string; title: string; fields: string[] }[] = [
  { id: "business", title: "Business", fields: ["business_type", "website", "about", "channels"] },
  { id: "audience", title: "Audience", fields: ["audience"] },
  { id: "offerings", title: "Offerings", fields: ["offerings"] },
  { id: "voice", title: "Tone of voice", fields: ["tone", "tone_notes"] },
  { id: "competitors", title: "Competitors", fields: ["competitors", "references"] },
  { id: "pillars", title: "Content pillars", fields: ["pillars"] },
  { id: "ctas", title: "Calls to action", fields: ["ctas"] },
  { id: "languages", title: "Languages", fields: ["languages"] },
  { id: "compliance", title: "Compliance rules", fields: ["compliance"] },
  { id: "goals", title: "Goals", fields: ["goals", "success"] },
  { id: "assets", title: "Brand assets", fields: ["logo_url", "brand_guide_url", "assets_folder_url", "colors_fonts"] },
];

export type Answers = Record<string, string | string[]>;
export type BrandProfile = { data: Answers; onboarding_step: number; onboarded_at: string | null; updated_at: string | null; updated_by: string };

export async function loadBrand(clientId: number, clientLanguages: string): Promise<BrandProfile> {
  const row = await one<BrandProfile>(
    "SELECT data, onboarding_step, onboarded_at::text, updated_at::text, updated_by FROM brand_profiles WHERE client_id = $1",
    [clientId],
  );
  const profile = row ?? { data: {}, onboarding_step: 1, onboarded_at: null, updated_at: null, updated_by: "" };
  const data = typeof profile.data === "string" ? (JSON.parse(profile.data) as Answers) : { ...profile.data };
  // Languages are stored on the client (billing and dashboard use them); show them here.
  data.languages = clientLanguages.split(",").map((s) => s.trim()).filter(Boolean);
  return { ...profile, data };
}

// Reads the answers for the given fields from a submitted form. Unknown keys are ignored.
export function readAnswers(form: FormData, keys: string[]): Answers {
  const out: Answers = {};
  for (const key of keys) {
    const f = fields[key];
    if (!f) continue;
    if (f.kind === "checks") {
      const allowed = new Set(f.options);
      out[key] = form.getAll(key).map(String).filter((v) => allowed.has(v)).slice(0, 20);
    } else {
      let v = String(form.get(key) ?? "").trim().slice(0, f.kind === "textarea" ? 3000 : 500);
      if (f.kind === "url" && v && !/^https?:\/\//i.test(v)) v = `https://${v}`;
      if (f.kind === "select" && v && !f.groups?.some((g) => g.options.includes(v))) v = "";
      out[key] = v;
    }
  }
  return out;
}

export async function saveAnswers(clientId: number, answers: Answers, by: string, progress?: { step?: number; finished?: boolean }) {
  const { languages, ...rest } = answers;
  if (languages !== undefined) {
    const list = (Array.isArray(languages) ? languages : [languages]).filter(Boolean);
    await query("UPDATE clients SET languages = $1 WHERE id = $2", [list.length ? list.join(", ") : "English", clientId]);
  }
  await query(
    `INSERT INTO brand_profiles (client_id, data, onboarding_step, onboarded_at, updated_at, updated_by)
     VALUES ($1, $2::jsonb, $3, CASE WHEN $4 THEN now() END, now(), $5)
     ON CONFLICT (client_id) DO UPDATE SET
       data = brand_profiles.data || EXCLUDED.data,
       onboarding_step = GREATEST(brand_profiles.onboarding_step, EXCLUDED.onboarding_step),
       onboarded_at = COALESCE(brand_profiles.onboarded_at, EXCLUDED.onboarded_at),
       updated_at = now(), updated_by = EXCLUDED.updated_by`,
    [clientId, JSON.stringify(rest), progress?.step ?? 1, Boolean(progress?.finished), by],
  );
}

const filled = (v: string | string[] | undefined) => (Array.isArray(v) ? v.length > 0 : Boolean(v && v.trim()));

// Share of Brand Brain sections with at least one answer.
export function completeness(data: Answers) {
  const done = sections.filter((s) => s.fields.some((k) => filled(data[k])));
  return { done: done.length, total: sections.length, missing: sections.filter((s) => !done.includes(s)).map((s) => s.title) };
}

export function hasAnswer(data: Answers, key: string) {
  return filled(data[key]);
}
