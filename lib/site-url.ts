// The public address of the site, e.g. https://www.nirakarmedia.com. Read on the
// server only, so a plain SITE_URL works; NEXT_PUBLIC_SITE_URL is still accepted.
export function configuredSiteUrl(): string | undefined {
  const v = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  return v ? v.replace(/\/$/, "") : undefined;
}

export function siteUrl(req: Request): string {
  return configuredSiteUrl() ?? new URL(req.url).origin;
}

// A public address that an outside machine (the MP4 render sandbox) can fetch from. Preview deployments
// sit behind Vercel's login, so without SITE_URL fall back to the production domain, which Vercel sets on
// every deployment (without the https://), before the request's own origin.
export function publicSiteUrl(req: Request): string {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return configuredSiteUrl() ?? (prod ? `https://${prod.replace(/\/$/, "")}` : new URL(req.url).origin);
}
