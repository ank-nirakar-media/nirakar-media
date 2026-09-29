export type PlanId = "starter" | "growth" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  priceInr: number;
  tagline: string;
  volume: string;
  languages: string;
  extraLanguageInr: number;
  dashboard: string;
  popular?: boolean;
  features: string[];
};

// Which engine stages each tier runs is defined in lib/content.ts (engine[].tiers).
// Edit volumes and highlights here; the pricing page, home page and Razorpay
// plans all follow.
export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceInr: 4999,
    tagline: "The engine for one channel: a light monthly plan, then we write, voice, edit and publish.",
    volume: "8 short videos a month",
    languages: "1 language",
    extraLanguageInr: 999,
    dashboard: "Published, views, engagement, subscriber growth",
    features: [
      "8 short videos a month (up to 60 seconds)",
      "Niche research at onboarding, light monthly content plan",
      "Scripts fact-checked by a human editor",
      "Natural AI voiceover in 1 language",
      "Editing with captions, B-roll and music",
      "Published to 1 platform",
      "Login dashboard and monthly report: views, engagement, growth",
      "Monthly next-content recommendations",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    priceInr: 14999,
    tagline: "The full strategy loop: every month's content is planned from what worked last month.",
    volume: "16 short videos a month",
    languages: "2 languages",
    extraLanguageInr: 2499,
    dashboard: "Adds search views, leads, best topics",
    popular: true,
    features: [
      "16 short videos a month",
      "Monthly idea discovery and competitor analysis",
      "Content strategy and calendar you approve",
      "Every video in 2 languages: original plus 1 regional dub",
      "Custom thumbnails, SEO titles, descriptions and tags",
      "Published to 3 platforms, repurposed for each",
      "Dashboard and report add search views, leads and best topics",
      "Monthly next-content recommendations",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceInr: 34999,
    tagline: "Your whole content operation, run weekly by a dedicated team.",
    volume: "30 short videos, or 15 shorts and 2 long-form",
    languages: "4 languages",
    extraLanguageInr: 3999,
    dashboard: "Adds conversion opportunities",
    features: [
      "30 short videos a month, or 15 shorts and 2 long-form",
      "Everything in Growth, for up to 2 channels",
      "Every video in 4 languages: original plus 3 regional dubs",
      "AI avatar presenter or your own cloned voice",
      "Published and repurposed on all 5 platforms, A/B tested thumbnails",
      "Dashboard and report add conversion opportunities",
      "Weekly recommendations, dedicated growth manager, monthly call",
    ],
  },
];

export function getPlan(id: string): Plan | undefined {
  return plans.find((p) => p.id === id);
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const languages = ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "Marathi"];
export const moreLanguages = ["Bengali", "Gujarati", "Punjabi", "Odia"];
