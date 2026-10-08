// Renders one frame from each walkthrough scene, for visual checks.  npx tsx scripts/walk-stills.ts
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { existsSync } from "node:fs";
import path from "node:path";
import { walkDurations, walkScenes } from "../lib/video/walkthrough";

const SANDBOX_CHROME = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const browserExecutable = process.env.REMOTION_CHROME ?? (existsSync(SANDBOX_CHROME) ? SANDBOX_CHROME : null);

async function main() {
  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts") });
  const composition = await selectComposition({ serveUrl, id: "Walkthrough", browserExecutable });
  let at = 0;
  for (const [i, d] of walkDurations().entries()) {
    const n = Math.round(d * 30);
    const output = `out/walk-${i + 1}-${walkScenes[i].id}.png`;
    await renderStill({ serveUrl, composition, frame: at + Math.floor(n * 0.75), output, browserExecutable });
    console.log("still", output);
    at += n;
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
