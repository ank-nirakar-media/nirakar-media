// Everything the Sales agent may say about Nirakar Media, built from the same data the website
// renders. Change a price or an FAQ in lib/plans.ts or lib/content.ts and Ask Purple follows.
import { audiences, engine, faqs, humansControl, platforms, site } from "../content";
import { formatInr, languages, launchOffer, moreLanguages, offerOpen, plans } from "../plans";

// The founding offer is listed until its end date. Whether seats are left is checked at checkout,
// so Ask Purple says "while spots last" rather than quoting a count.
export function knowledgePack(now = new Date()): string {
  const offer = offerOpen(0, now);
  const plan = plans.map((p) =>
    [
      `### ${p.name}: ${formatInr(p.priceInr)} a month${p.popular ? " (most popular)" : ""}`,
      ...(offer ? [`Founding offer: ${formatInr(launchOffer.priceInr[p.id])} a month instead of ${formatInr(p.priceInr)}.`] : []),
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
    ...(offer
      ? [
          `${launchOffer.name}: the first ${launchOffer.seats} customers pay the founding-offer price below for as long as they stay subscribed. ` +
            `It ends on ${launchOffer.endsLabel} or when the ${launchOffer.seats} spots are taken, whichever comes first. ` +
            "Checkout applies it automatically while spots last; the pricing page shows how many are left.",
        ]
      : []),
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
  return new Set([0, ...plans.flatMap((p) => [p.priceInr, p.extraLanguageInr, launchOffer.priceInr[p.id]])]);
}
