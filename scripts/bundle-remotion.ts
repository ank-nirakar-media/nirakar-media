// Bundles the Remotion compositions into .remotion before `next build`, so the export route can copy the
// bundle into a Vercel Sandbox and render MP4s there (lib/video/exports.ts).
import { bundle } from "@remotion/bundler";
import path from "node:path";

async function main() {
  const out = await bundle({ entryPoint: path.resolve("remotion/index.ts"), outDir: path.resolve(".remotion") });
  console.log("Remotion bundle written to", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
