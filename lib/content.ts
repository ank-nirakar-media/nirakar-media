import type { PlanId } from "./plans";

export const site = {
  name: "Nirakar Media",
  tagline: "You run your business. We run your content engine.",
  description:
    "Nirakar Media is AI-powered Content Growth as a Service. We research, plan, produce, publish and analyse faceless video for YouTube, Instagram, TikTok, Facebook and X. ₹0 setup, month-to-month, and you keep 100% of your ad revenue.",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@nirakarmedia.com",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
};

export const nav = [
  { href: "/services", label: "The engine" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/dashboard", label: "Dashboard demo" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export const platforms = ["YouTube", "Instagram", "TikTok", "Facebook", "X"];

export const audiences = [
  { title: "YouTubers", text: "Hand over the research, production and uploads, and keep the ideas and the audience." },
  { title: "Small businesses", text: "Turn what you know about your trade into a steady stream of content that brings in customers." },
  { title: "D2C brands", text: "Product stories, explainers and how-tos planned around what your buyers search for." },
  { title: "Coaches and educators", text: "Your frameworks become a weekly content series while you stay with your clients." },
  { title: "Agencies", text: "A white-label content engine for your clients, run on your schedule." },
  { title: "Faceless creators", text: "Scale a niche channel with research, scripts and a consistent voice behind every upload." },
  { title: "Multi-channel operators", text: "Run several channels with one strategy team, one reporting view and one bill." },
  { title: "Entrepreneurs and brands", text: "Build an audience around your idea before, during and after launch." },
];

// The content engine: every stage, the phase it belongs to, and the tiers that run it.
export type Owner = "AI" | "Human" | "AI + human review";
export type Stage = { name: string; detail: string; tiers: PlanId[]; owner: Owner };
export type Phase = { slug: string; title: string; summary: string; stages: Stage[] };

const all: PlanId[] = ["starter", "growth", "pro"];
const growthUp: PlanId[] = ["growth", "pro"];

export const engine: Phase[] = [
  {
    slug: "discover",
    title: "Discover",
    summary: "Find what your audience wants before anyone makes a video.",
    stages: [
      { name: "Idea discovery", owner: "AI + human review", detail: "Search trends, audience questions and rising topics in your niche, every month.", tiers: growthUp },
      { name: "Niche research", owner: "AI + human review", detail: "Map your niche: audience, formats that work, gaps nobody is covering.", tiers: all },
      { name: "Competitor analysis", owner: "AI + human review", detail: "Study the channels you compete with: what they post, what performs, where they are weak.", tiers: growthUp },
    ],
  },
  {
    slug: "plan",
    title: "Plan",
    summary: "Turn research into a content strategy you approve.",
    stages: [
      { name: "Content strategy", owner: "Human", detail: "Pillars, series and a monthly calendar tied to your business goals.", tiers: all },
    ],
  },
  {
    slug: "produce",
    title: "Produce",
    summary: "Make every video to a consistent standard, with people checking the AI's work.",
    stages: [
      { name: "Scriptwriting", owner: "AI + human review", detail: "Hook-first scripts in English, Hindi or Hinglish, written for retention.", tiers: all },
      { name: "Human QA", owner: "Human", detail: "An editor checks facts, brand consistency, compliance and every final cut before it reaches you.", tiers: all },
      { name: "AI voice or avatar", owner: "AI", detail: "Natural AI voices on every plan. AI avatar presenters or your own cloned voice on Pro, only with written consent.", tiers: all },
      { name: "Editing", owner: "AI + human review", detail: "Footage, motion graphics, captions, music and sound design, in 9:16 and 16:9.", tiers: all },
      { name: "Thumbnails", owner: "AI + human review", detail: "Custom thumbnails and covers designed for phone screens; A/B variants on Pro.", tiers: growthUp },
    ],
  },
  {
    slug: "distribute",
    title: "Distribute",
    summary: "Get every video in front of the right people, on every platform and in every language.",
    stages: [
      { name: "SEO", owner: "AI", detail: "Titles, descriptions, tags and hashtags written for each platform's search.", tiers: growthUp },
      { name: "Publishing", owner: "AI", detail: "Auto Uploader posts on schedule to YouTube, Instagram, TikTok, Facebook and X.", tiers: all },
      { name: "Multi-platform repurposing", owner: "AI", detail: "Each video recut, re-captioned and resized for every platform in your plan.", tiers: growthUp },
      { name: "Multilingual dubbing", owner: "AI + human review", detail: "AI dubbing and localisation into Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi and more, checked by native speakers.", tiers: all },
    ],
  },
  {
    slug: "learn",
    title: "Learn",
    summary: "Show the business results and feed them into next month's plan.",
    stages: [
      { name: "Outcome reporting", owner: "AI + human review", detail: "A monthly outcome report on views, engagement, leads, search views, subscriber growth and what to do next. You also get a private login dashboard with the same numbers, updated daily.", tiers: all },
      { name: "Next-content recommendations", owner: "AI + human review", detail: "Specific topics and formats to make next, based on your own numbers.", tiers: all },
    ],
  },
];

export const stageCount = engine.reduce((n, p) => n + p.stages.length, 0);

// How each tier runs a stage, where it differs from simply "included".
export const stageNotes: Partial<Record<string, Partial<Record<PlanId, string>>>> = {
  "Niche research": { starter: "At onboarding", growth: "Monthly", pro: "Monthly" },
  "AI voice or avatar": { starter: "Voice", growth: "Premium voices", pro: "Avatar or cloned voice" },
  Thumbnails: { pro: "A/B tested" },
  Publishing: { starter: "1 platform", growth: "3 platforms", pro: "5 platforms" },
  "Outcome reporting": { starter: "Core metrics", growth: "+ search, leads, topics", pro: "+ conversion opportunities" },
  "Content strategy": { starter: "Light monthly plan", growth: "Full calendar", pro: "Full calendar, 2 channels" },
  "Multilingual dubbing": { starter: "Add-on", growth: "1 extra language", pro: "3 extra languages" },
  "Next-content recommendations": { starter: "Monthly", growth: "Monthly", pro: "Weekly" },
};

export const steps = [
  {
    title: "Subscribe and share your goals",
    text: "Pick a plan and fill in a short brief: your business, audience, goals and the channels you admire.",
  },
  {
    title: "We research and plan",
    text: "Within three working days you get your niche and competitor research and a content plan for the month. Approve it or ask for changes.",
  },
  {
    title: "We produce, with humans checking",
    text: "Scripts, voice, editing and thumbnails are made with AI and reviewed by our editors before anything reaches you.",
  },
  {
    title: "You approve, we publish everywhere",
    text: "Review videos in a shared folder. Approved videos go out on schedule, optimised and repurposed for each platform in your plan.",
  },
  {
    title: "We measure and plan the next round",
    text: "Each cycle ends with a report on what worked and what to make next, which becomes the next content plan.",
  },
];

export const faqs = [
  {
    q: "What is Content Growth as a Service?",
    a: "Instead of buying individual videos, you subscribe to a team that runs your whole content operation: research, strategy, production, publishing and analytics, repeating every month and improving from your own results.",
  },
  {
    q: "Do I need to record anything or show my face?",
    a: "No. Everything is faceless. We write the script, create the voice or AI presenter and build the visuals. You approve the plan and review the videos.",
  },
  {
    q: "Where does AI stop and people start?",
    a: "AI speeds up research, voice, visuals and editing. People set your strategy, check every script for accuracy and tone, and review every final video before it goes to you.",
  },
  {
    q: "Who owns the channel and the videos?",
    a: "You do. The channels stay in your name, you own the finished videos, and you keep 100% of any ad revenue, sponsorships and sales they bring in.",
  },
  {
    q: "Is there a setup fee or a contract?",
    a: "No. Setup is ₹0 and every plan is month-to-month. You can upgrade, downgrade or cancel before your next billing date.",
  },
  {
    q: "How does payment work?",
    a: "You subscribe online with a card through our secure checkout. The plan renews monthly in INR. Indian banks may ask you to approve the recurring payment the first time, and again each month for larger amounts, as required by RBI rules.",
  },
  {
    q: "Which languages do you support?",
    a: "We produce in English, Hindi and Hinglish and dub into Kannada, Tamil, Telugu, Malayalam and Marathi, with Bengali, Gujarati, Punjabi and Odia on request. Growth includes one extra language and Pro three; you can add more to any plan each month.",
  },
  {
    q: "Is AI dubbing good enough for regional audiences?",
    a: "AI gives us the first pass. A native speaker then checks the translation, names, numbers and cultural references, and we fix anything that sounds off before it is published.",
  },
  {
    q: "How will I see results?",
    a: "Every month you get an outcome report: content published, views, engagement, leads, search views, subscriber growth, your best-performing topics and conversion opportunities we spotted, like comments asking for prices. You can also log in to your own dashboard at any time: connect your YouTube and Instagram accounts and it updates every day. How much it covers depends on your plan; the demo on this site shows the full Pro view.",
  },
  {
    q: "Do you publish on TikTok for Indian clients?",
    a: "TikTok is not available in India, so for Indian audiences we publish to YouTube Shorts, Instagram Reels, Facebook and X instead. We publish to TikTok for clients targeting audiences outside India.",
  },
  {
    q: "Are AI voices and avatars allowed, and can the videos be monetised?",
    a: "Yes, when the content is original and adds value. Platforms require disclosure of realistic synthetic media in some cases, and we add those labels for you. We never clone a real person's voice or likeness without their written consent.",
  },
  {
    q: "Can you guarantee growth?",
    a: "No one honestly can. What we guarantee is the work: the research, the volume, the quality checks and the monthly learning loop. Results depend on your niche, offer and consistency.",
  },
  {
    q: "Can I get long-form videos or run several channels?",
    a: "Yes. Pro includes long-form and up to two channels. For more, or for agency volumes, contact us for a custom plan.",
  },
];

export const aiHandles = ["Research", "First drafts", "Voice generation", "Captioning", "Repurposing", "Thumbnail concepts", "SEO", "Analytics"];
export const humansControl = [
  { title: "Fact checking", text: "Every claim in every script is checked before production." },
  { title: "Brand consistency", text: "Tone, visuals and messaging match your brand guide on every platform." },
  { title: "Creative judgment", text: "People pick the angles, hooks and stories worth telling." },
  { title: "Compliance", text: "Platform rules, AI disclosure labels, ad claims and consent for any voice or likeness." },
  { title: "Final QA", text: "A person watches every video, in every language, before it goes to you." },
];

export const dashboardMetrics = [
  "Content published", "Views", "Engagement", "Leads generated",
  "Search views", "Subscriber growth", "Best-performing topics", "Conversion opportunities",
];

// Six-step summary of the engine for the home page. Each maps onto stages above.
export const workflow = [
  { slug: "discover", title: "Discover", text: "Audience questions, niche research and competitor analysis, refreshed every month." },
  { slug: "plan", title: "Plan", text: "Research becomes content pillars, series and a monthly calendar you approve." },
  { slug: "create", title: "Create", text: "Scripts, AI voice or avatar, editing and thumbnails, with an editor checking each piece." },
  { slug: "repurpose", title: "Repurpose", text: "Each video recut for every platform and dubbed into the Indian languages you sell in." },
  { slug: "publish", title: "Publish", text: "Your approval, then scheduled posting with titles, tags and captions written for search." },
  { slug: "optimize", title: "Optimize", text: "A daily dashboard and a monthly review that decide what the next round makes." },
];

export const verticals = [
  { title: "Creators", who: "YouTubers, faceless channels, multi-channel operators", text: "Grow a channel without filming it: research, scripts, voice and uploads handled for you." },
  { title: "Brands", who: "D2C brands, entrepreneurs, agencies", text: "Product stories and explainers planned around what buyers search for, with leads tracked." },
  { title: "Businesses", who: "Local businesses, coaches, educators", text: "Turn what you know into a weekly series that brings in customers while you run the business." },
];

export const highlights = [
  { icon: "engine", title: `${stageCount}-stage workflow`, text: "End to end, no gaps" },
  { icon: "verticals", title: "3 business verticals", text: "Creators, brands, businesses" },
  { icon: "rupee", title: "INR pricing", text: "₹0 setup, month-to-month" },
  { icon: "globe", title: "Multilingual ready", text: "7+ Indian languages" },
  { icon: "people", title: "Human + AI", text: "AI for scale, people for judgment" },
];

export const promises = [
  { value: "7+", label: "Indian languages" },
  { value: String(stageCount), label: "stages, one team" },
  { value: "₹0", label: "setup fee" },
  { value: "100%", label: "ad revenue stays yours" },
];

