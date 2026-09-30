// The public address of the site, e.g. https://www.nirakarmedia.com. Read on the
// server only, so a plain SITE_URL works; NEXT_PUBLIC_SITE_URL is still accepted.
export function configuredSiteUrl(): string | undefined {
  const v = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  return v ? v.replace(/\/$/, "") : undefined;
}

export function siteUrl(req: Request): string {
  return configuredSiteUrl() ?? new URL(req.url).origin;
}
