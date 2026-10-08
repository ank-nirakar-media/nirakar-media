// Renders a VideoPlan to MP4 with Remotion. Used locally and by the render job.
//   npx tsx scripts/render.ts [plan.json] [out.mp4] [--stills]
// With no plan it renders the built-in sample (no audio or stock clips, works offline).
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { planFrames, type VideoPlan } from "../lib/video/plan";
import { samplePlan } from "../remotion/sample";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const stills = process.argv.includes("--stills");
const plan: VideoPlan = args[0] ? JSON.parse(readFileSync(args[0], "utf8")) : samplePlan;
const out = args[1] ?? "out/sample.mp4";
const SANDBOX_CHROME = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const browserExecutable = process.env.REMOTION_CHROME ?? (existsSync(SANDBOX_CHROME) ? SANDBOX_CHROME : null);

async function main() {
  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts") });
  const inputProps = { plan };
  const composition = await selectComposition({ serveUrl, id: "Short", inputProps, browserExecutable });
  if (stills) {
    // One frame from the middle of each scene, for quick visual checks.
    let at = 0;
    for (const [i, s] of plan.scenes.entries()) {
      const n = Math.round(s.durationSec * plan.fps);
      const output = out.replace(/\.mp4$/, `-${i + 1}.png`);
      await renderStill({ serveUrl, composition, inputProps, frame: at + Math.floor(n * 0.6), output, browserExecutable });
      console.log("still", output);
      at += n;
    }
    return;
  }
  await renderMedia({ serveUrl, composition, inputProps, codec: "h264", outputLocation: out, browserExecutable });
  console.log(`rendered ${out} (${planFrames(plan)} frames)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
