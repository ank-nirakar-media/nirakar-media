// Everything the Sales agent may say about Nirakar Media, built from the same data the website
// renders. Change a price or an FAQ in lib/plans.ts or lib/content.ts and Ask Purple follows.
import { audiences, engine, faqs, humansControl, platforms, site } from "../content";
import { formatInr, languages, moreLanguages, plans } from "../plans";

export function knowledgePack(): string {
  const plan = plans.map((p) =>
    [
      `### ${p.name}: ${formatInr(p.priceInr)} a month${p.popular ? " (most popular)" : ""}`,
      p.tagline,
      `Volume: ${p.volume}. Languages included: ${p.languages}. Extra language: ${formatInr(p.extraLanguageInr)} a month each.`,
      `Dashboard: ${p.dashboard}.`,
      ...p.features.map((f) => `- ${f}`),
    ].join("\n"),
  );
  const stages = engine.map((phase) =>
    [
      `### ${phase.title}: ${phase.summary}`,
      ...phase.stages.map((s) => `- ${s.name} (${s.owner}; plans: ${s.tiers.join(", ")}): ${s.detail}`),
    ].join("\n"),
  );
  return [
    `# ${site.name}`,
    site.description,
    `Tagline: ${site.tagline}`,
    `Contact: ${site.email}, or the contact form at /contact. Pricing page: /pricing. FAQ: /faq. Terms of Service: /legal/terms. Refunds: /legal/refunds.`,
    "",
    "## Plans (prices in INR, billed monthly, ₹0 setup, month-to-month)",
    ...plan,
    "",
    "## The content engine",
    ...stages,
    "",
    "## Languages",
    `Produced or dubbed in: ${languages.join(", ")}. On request: ${moreLanguages.join(", ")}.`,
    `Platforms: ${platforms.join(", ")}.`,
    "",
    "## Who it is for",
    ...audiences.map((a) => `- ${a.title}: ${a.text}`),
    "",
    "## What people check",
    ...humansControl.map((h) => `- ${h.title}: ${h.text}`),
    "",
    "## FAQ",
    ...faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`),
  ].join("\n");
}

// Every rupee amount Ask Purple may quote. Anything else in a reply is treated as invented.
export function allowedAmounts(): Set<number> {
  return new Set([0, ...plans.flatMap((p) => [p.priceInr, p.extraLanguageInr])]);
}
