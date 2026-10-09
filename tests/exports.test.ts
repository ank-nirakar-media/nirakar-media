import "./helpers";
import assert from "node:assert/strict";
import { test } from "node:test";
import { query } from "../lib/db";
import { createExport, EXPORT_SOURCES, exportInput, exportPath, getExport, listExports, refreshExport, renderedNotUploaded, renderConfigured, startExport } from "../lib/video/exports";
import { samples } from "../lib/video/samples";
import { walkScenes } from "../lib/video/walkthrough";
import { shortExportMetadata, walkExportMetadata } from "../remotion/exports";

const SITE = "https://www.example.com";

test("export input: absolute voice URLs from the site, silent when voice is off", () => {
  const short = exportInput("dental", SITE, "abc")!;
  assert.equal(short.compositionId, "ShortExport");
  assert.match(String(short.inputProps.voiceSrc), /^https:\/\/www\.example\.com\/api\/sample-voice\/dental\/full\?v=[0-9a-z]+&s=abc$/);
  assert.equal(exportInput("dental", SITE, null)!.inputProps.voiceSrc, undefined);

  const walk = exportInput("walkthrough", SITE, "d")!;
  assert.equal(walk.compositionId, "WalkthroughExport");
  const srcs = walk.inputProps.voiceSrcs as string[];
  assert.equal(srcs.length, walkScenes.length);
  assert.ok(srcs.every((s, i) => s.startsWith(`${SITE}/api/sample-voice/walkthrough/${i}?`)));
  assert.equal(exportInput("nope", SITE, "d"), undefined);
  assert.deepEqual(EXPORT_SOURCES.map((s) => s.id), ["walkthrough", ...samples.map((s) => s.id)]);
});

test("export metadata: the render measures the voice and times the video to it", async () => {
  const short = await shortExportMetadata({ sample: "ca", voiceSrc: "/v.mp3" }, async () => 10);
  assert.equal(short.props.plan.voiceover?.src, "/v.mp3");
  assert.equal(short.width, 1080);
  assert.equal(short.durationInFrames, Math.round(short.props.plan.scenes.reduce((n, s) => n + s.durationSec, 0) * 30));
  assert.ok(Math.abs(short.durationInFrames / 30 - 10.6) < 0.3);

  const silent = await shortExportMetadata({ sample: "ca" }, async () => { throw new Error("no voice expected"); });
  assert.equal(silent.props.plan.voiceover, undefined);

  const walk = await walkExportMetadata({ voiceSrcs: walkScenes.map((_, i) => `/w${i}.mp3`) }, async () => 3);
  assert.ok(walk.props.walk.durations.every((d) => d === 3.8));
  assert.equal(walk.durationInFrames, walkScenes.length * 114);
  assert.deepEqual(walk.props.walk.audio, walkScenes.map((_, i) => `/w${i}.mp3`));
});

test("exports: rows are created only for known videos, and fail clearly without a Blob store", async () => {
  assert.equal(await createExport("nope", "a@b.c"), undefined);
  const id = (await createExport("dental", "a@b.c"))!;
  assert.equal((await getExport(id))!.status, "starting");

  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  await startExport(id, SITE);
  const failed = (await getExport(id))!;
  assert.equal(failed.status, "error");
  assert.match(failed.error!, /No Blob store is connected/);

  const stuck = (await createExport("ca", "a@b.c"))!;
  await query("UPDATE video_exports SET created_at = now() - interval '20 minutes' WHERE id = $1", [stuck]);
  assert.equal((await refreshExport(stuck))!.status, "error", "a render that never started is reported, not left spinning");
  const fresh = (await createExport("cafe", "a@b.c"))!;
  assert.equal((await refreshExport(fresh))!.status, "starting");

  assert.deepEqual((await listExports()).map((r) => r.id), [fresh, stuck, id]);
  assert.equal(await refreshExport(9999), undefined);
});

test("exports: a private store (BLOB_STORE_ID) counts as connected, and the sandbox's missing-token stop means rendered", () => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  assert.equal(renderConfigured(), false);
  process.env.BLOB_STORE_ID = "store_test";
  assert.equal(renderConfigured(), true);
  delete process.env.BLOB_STORE_ID;
  assert.equal(renderedNotUploaded("Rendered 300/300 ... BLOB_READ_WRITE_TOKEN is not set.\n"), true);
  assert.equal(renderedNotUploaded("Error: Could not open browser"), false);
  assert.equal(exportPath("walkthrough", 7), "exports/nirakar-walkthrough-7.mp4");
});
