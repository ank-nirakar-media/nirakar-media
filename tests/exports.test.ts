import "./helpers";
import assert from "node:assert/strict";
import { test } from "node:test";
import { query } from "../lib/db";
import { createExport, EXPORT_SOURCES, exportInput, exportPath, getExport, listExports, measureVoices, refreshExport, renderedNotUploaded, renderConfigured, startExport } from "../lib/video/exports";
import { mp3Seconds } from "../lib/video/mp3";
import { publicSiteUrl } from "../lib/site-url";
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

test("exports: the render fetches voices from a public address, never the login-gated preview", () => {
  const env = { ...process.env };
  const req = new Request("https://nirakar-media-git-x.vercel.app/api/admin/exports", { method: "POST" });
  try {
    delete process.env.SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "www.nirakarmedia.com";
    assert.equal(publicSiteUrl(req), "https://www.nirakarmedia.com");
    process.env.SITE_URL = "https://www.example.com/";
    assert.equal(publicSiteUrl(req), "https://www.example.com");
    delete process.env.SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    assert.equal(publicSiteUrl(req), "https://nirakar-media-git-x.vercel.app");
  } finally {
    process.env = env;
  }
});

// n silent MPEG-1 Layer III frames at 128 kbps / 44.1 kHz (417 bytes each, 1152 samples), after an ID3 tag.
function fakeMp3(n: number) {
  const id3 = Uint8Array.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 5, 1, 2, 3, 4, 5]);
  const frame = new Uint8Array(417);
  frame.set([0xff, 0xfb, 0x90, 0x00]);
  const out = new Uint8Array(id3.length + n * frame.length);
  out.set(id3);
  for (let i = 0; i < n; i++) out.set(frame, id3.length + i * frame.length);
  return out;
}

test("exports: voice length is read from the MP3 itself, not left to Chrome (which can say Infinity)", async () => {
  assert.equal(mp3Seconds(fakeMp3(100)), Math.round((100 * 1152 / 44100) * 1000) / 1000);
  assert.equal(mp3Seconds(new TextEncoder().encode("<html>login</html>")), undefined);

  const files: Record<string, Uint8Array<ArrayBuffer>> = { "https://s/a": fakeMp3(100), "https://s/b": fakeMp3(50) };
  const get = (async (url: string) => (files[url] ? new Response(files[url]) : new Response("no", { status: 401 }))) as typeof fetch;
  assert.deepEqual(await measureVoices(["https://s/a", "https://s/b"], get), [2.612, 1.306]);
  await assert.rejects(measureVoices(["https://s/x"], get), /answered 401/);

  const never = async () => { throw new Error("measured in render"); };
  const short = await shortExportMetadata({ sample: "ca", voiceSrc: "/v.mp3", voiceSeconds: 10 }, never);
  assert.equal(short.props.plan.voiceover?.src, "/v.mp3");
  const walk = await walkExportMetadata({ voiceSrcs: walkScenes.map((_, i) => `/w${i}.mp3`), voiceSeconds: walkScenes.map(() => 3) }, never);
  assert.ok(walk.props.walk.durations.every((d) => d === 3.8));
  await assert.rejects(shortExportMetadata({ sample: "ca", voiceSrc: "/v.mp3" }, async () => Infinity), /Couldn't read the length/);
});
