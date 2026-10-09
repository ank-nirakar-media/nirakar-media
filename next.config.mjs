/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "@remotion/vercel", "@vercel/sandbox"],
  outputFileTracingIncludes: {
    "/**": ["./db/schema.sql"],
    // The Remotion bundle that MP4 exports copy into the render sandbox (scripts/bundle-remotion.ts).
    "/api/admin/exports": ["./.remotion/**/*"],
  },
};

export default nextConfig;
