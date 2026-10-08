import "./helpers";
import assert from "node:assert/strict";
import { test } from "node:test";
import { one } from "../lib/db";
import { brandColors, planFromScenes, safeColor } from "../lib/video/build";
import { captionGroups, estimateSeconds, layoutFor, LAYOUTS, planFrames, sceneFrames, timeWords } from "../lib/video/plan";
import { createSampleRequest, phoneKey, setSampleStatus } from "../lib/video/requests";
import { samplePlan, samples, WATERMARK } from "../lib/video/samples";
import { voiceLine, voiceUrl } from "../lib/video/voices";
import { walkDurations, walkScenes } from "../lib/video/walkthrough";
import { synthesize } from "../lib/video/voice";
import { GET as sampleVoice } from "../app/api/sample-voice/[sample]/[scene]/route";

test("caption timings cover the spoken part of the scene, in order, without overlap", () => {
  const words = timeWords("Daant mein dard? Ise ignore mat kijiye.", 3);
  assert.equal(words.length, 7);
  assert.equal(words[0].start, 0.15);
  assert.ok(Math.abs(words.at(-1)!.end - 2.75) < 0.02, `ends at ${words.at(-1)!.end}`);
  for (let i = 1; i < words.length; i++) assert.ok(words[i].start >= words[i - 1].end - 0.01);
  // Longer words and words before a pause get more time.
  assert.ok(words[2].end - words[2].start > words[1].end - words[1].start);
  assert.deepEqual(timeWords("", 3), []);
  assert.deepEqual(timeWords("hello", 0), []);
});

test("Devanagari is timed by letters, not bytes", () => {
  const words = timeWords("दाँत में दर्द?", 2);
  assert.equal(words.length, 3);
  assert.ok(words.every((w) => w.end > w.start));
});

test("captions break into short lines and at sentence ends", () => {
  const groups = captionGroups(timeWords("Saal mein do baar checkup karwaiye. Aaj hi book kijiye.", 5));
  assert.ok(groups.every((g) => g.length <= 3));
  assert.ok(groups.some((g) => g.at(-1)!.text === "karwaiye."), "a sentence end closes its line");
  assert.equal(groups.flat().length, 10);
  assert.ok(captionGroups(timeWords("Hindi हिंदी। English", 3)).some((g) => g.at(-1)!.text === "हिंदी।"));
});

test("plan length in frames is the sum of its scenes at 30 fps", () => {
  assert.equal(sceneFrames({ durationSec: 2.5 }), 75);
  assert.equal(planFrames({ scenes: [{ durationSec: 1 }, { durationSec: 2.5 }] } as never), 105);
  assert.equal(planFrames({ scenes: [] }), 1);
  assert.equal(estimateSeconds("one two three four five six"), 2.9);
  assert.equal(estimateSeconds("hi"), 2);
});

test("layouts rotate with the seed", () => {
  assert.deepEqual([0, 1, 2, 3].map(layoutFor), ["bold", "clean", "stack", "bold"]);
  assert.ok(LAYOUTS.includes(layoutFor(-7)));
});

test("a scene plan becomes a video plan, skipping empty scenes and preferring real audio length", () => {
  const plan = planFromScenes({
    scenes: [
      { voiceover: "Aaj hi book kijiye.", on_screen_text: "Book today" },
      { voiceover: " ", on_screen_text: "" },
      { voiceover: "Real audio here.", on_screen_text: "", audioSec: 4.2, audioSrc: "https://example.com/a.mp3" },
    ],
    brand: { name: "Test", primary: "#111111", accent: "#222222" },
    language: "Hinglish",
    seed: 4,
  });
  assert.equal(plan.scenes.length, 2);
  assert.equal(plan.layout, "clean");
  assert.equal(plan.scenes[1].durationSec, 4.2);
  assert.equal(plan.scenes[1].audioSrc, "https://example.com/a.mp3");
  assert.deepEqual(plan.scenes[0].visual, { kind: "color" });
  assert.equal(plan.watermark, undefined);
});

test("brand colours come from the Brand Brain answer, with safe fallbacks", () => {
  assert.deepEqual(brandColors("#2E1065 purple, #F59E0B amber, Poppins"), { primary: "#2E1065", accent: "#F59E0B" });
  assert.deepEqual(brandColors("#abc"), { primary: "#AABBCC", accent: "#D0DAE3" });
  assert.equal(brandColors("purple and gold").primary, "#8B5CF6");
  assert.equal(safeColor("#ff0000", "#000000"), "#FF0000");
  assert.equal(safeColor("red; background:url(x)", "#000000"), "#000000");
});

test("website samples are watermarked and take the visitor's business name", () => {
  for (const s of samples) {
    const plan = samplePlan(s);
    assert.equal(plan.watermark, WATERMARK);
    assert.ok(plan.scenes.length >= 3);
    const seconds = plan.scenes.reduce((n, x) => n + x.durationSec, 0);
    assert.ok(seconds >= 8 && seconds <= 60, `${s.id} is ${seconds}s`);
    assert.ok(!/\d+%|₹\s?\d/.test(JSON.stringify(s.scenes)), `${s.id} has no invented numbers or prices`);
  }
  const mine = samplePlan(samples[0], { name: "Ankit Dental", primary: "#000000", accent: "#FFFFFF" });
  assert.equal(mine.brand.name, "Ankit Dental");
  assert.ok(!JSON.stringify(mine).includes("Smile Dental"));
  const cafe = samplePlan(samples[1], { name: "Ankit Cafe", primary: "#000000", accent: "#FFFFFF" });
  assert.equal(cafe.scenes.at(-1)!.onScreenText, "Ankit Cafe", "on-screen brand name follows the visitor's name");
});

test("free sample requests: one per phone number, any format", async () => {
  assert.equal(phoneKey("+91 98765 43210"), "9876543210");
  assert.equal(phoneKey("098765-43210"), "9876543210");
  assert.equal(phoneKey("12345"), null);

  const base = { name: "Asha", business: "Asha Clinic", email: "asha@example.com", phone: "+91 98765 43210", niche: "Clinic", language: "Hindi", topic: "" };
  assert.equal(await createSampleRequest(base), "ok");
  assert.equal(await createSampleRequest({ ...base, phone: "9876543210", email: "other@example.com" }), "duplicate");
  assert.equal(await createSampleRequest({ ...base, phone: "123" }), "invalid");
  assert.equal(await createSampleRequest({ ...base, email: "nope", phone: "9000000001" }), "invalid");
  assert.equal(await createSampleRequest({ ...base, phone: "9000000002", language: "Klingon" }), "ok");

  const row = await one<{ id: number; status: string; language: string }>("SELECT id, status, language FROM sample_requests WHERE phone_key = '9000000002'");
  assert.equal(row!.status, "new");
  assert.equal(row!.language, "", "unknown languages are not stored");
  assert.equal(await setSampleStatus(row!.id, "approved", "Make it in Hindi"), true);
  assert.equal(await setSampleStatus(row!.id, "deleted", ""), false);
  assert.equal((await one<{ status: string }>("SELECT status FROM sample_requests WHERE id = $1", [row!.id]))!.status, "approved");
});

test("sample voice lines: never the business name, Devanagari for Hindi voices, within Sarvam's limit", () => {
  for (const s of samples) {
    for (const x of s.scenes) {
      assert.ok(x.say.trim() && x.say.length <= 2500);
      assert.ok(!x.say.includes(s.brand.name) && !x.voiceover.includes(s.brand.name), `${s.id}: "${x.say}" names the business`);
      if (s.voice.languageCode === "hi-IN") assert.ok(!/[a-z]{3}/i.test(x.say), `${s.id}: Hindi voice line should be Devanagari: "${x.say}"`);
    }
  }
  assert.match(voiceUrl("dental", 2), /^\/api\/sample-voice\/dental\/2\?v=[0-9a-z]+$/);
  assert.notEqual(voiceUrl("dental", 0), voiceUrl("dental", 1));
  assert.deepEqual(voiceLine("cafe", 0), { text: samples[1].scenes[0].say, languageCode: "hi-IN", speaker: "shubh" });
  assert.equal(voiceLine("walkthrough", 0)!.languageCode, "en-IN");
  assert.equal(voiceLine("walkthrough", walkScenes.length), undefined);
  assert.equal(voiceLine("nope", 0), undefined);
});

test("with voice, scenes last as long as the speech and carry the audio", () => {
  const track = samples[0].scenes.map((_, i) => ({ src: `/v/${i}.mp3`, seconds: 2 + i }));
  const plan = samplePlan(samples[0], undefined, track);
  assert.deepEqual(plan.scenes.map((x) => x.durationSec), [2.35, 3.35, 4.35, 5.35]);
  assert.equal(plan.scenes[3].audioSrc, "/v/3.mp3");
  assert.ok(plan.scenes[3].words.at(-1)!.end <= 5.35);
});

test("Sarvam request matches the documented API, and the key never leaves the header", async () => {
  const realFetch = globalThis.fetch;
  let seen: { url: string; init: RequestInit } | undefined;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen = { url, init };
    return new Response(JSON.stringify({ request_id: "x", audios: [Buffer.from("ID3audio").toString("base64")] }), { status: 200 });
  }) as typeof fetch;
  try {
    delete process.env.SARVAM_API_KEY;
    assert.deepEqual(await synthesize({ text: "नमस्ते", languageCode: "hi-IN", speaker: "priya" }), { ok: false, error: "SARVAM_API_KEY is not set" });
    process.env.SARVAM_API_KEY = "test-key";
    const res = await synthesize({ text: "नमस्ते", languageCode: "hi-IN", speaker: "priya" });
    assert.ok(res.ok && res.audio.toString() === "ID3audio");
    assert.equal(seen!.url, "https://api.sarvam.ai/text-to-speech");
    assert.equal((seen!.init.headers as Record<string, string>)["api-subscription-key"], "test-key");
    const body = JSON.parse(String(seen!.init.body));
    assert.deepEqual(body, { text: "नमस्ते", language_code: "hi-IN", model: "bulbul:v3", speaker: "priya", pace: 1, output_audio_codec: "mp3" });

    globalThis.fetch = (async () => new Response("bad key", { status: 403 })) as unknown as typeof fetch;
    const bad = await synthesize({ text: "hi", languageCode: "en-IN", speaker: "rohan" });
    assert.ok(!bad.ok && bad.error.startsWith("Sarvam 403"));
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.SARVAM_API_KEY;
  }
});

test("sample voice route: only known lines, cached by the CDN, 503 when voice is off", async () => {
  const call = (sample: string, scene: string) => sampleVoice(new Request("http://x"), { params: Promise.resolve({ sample, scene }) });
  assert.equal((await call("nope", "0")).status, 404);
  assert.equal((await call("dental", "9")).status, 404);
  assert.equal((await call("dental", "1abc")).status, 404);
  delete process.env.SARVAM_API_KEY;
  assert.equal((await call("dental", "0")).status, 503);

  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response(JSON.stringify({ audios: [Buffer.from("mp3").toString("base64")] })); }) as unknown as typeof fetch;
  process.env.SARVAM_API_KEY = "test-key";
  try {
    const ok = await call("ca", "0");
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("content-type"), "audio/mpeg");
    assert.match(ok.headers.get("cache-control")!, /s-maxage=31536000/);
    await call("ca", "0");
    assert.equal(calls, 1, "a second request is served from memory");
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.SARVAM_API_KEY;
  }
});

test("walkthrough: every scene narrated, timed to the voice when it exists", () => {
  assert.ok(walkScenes.every((s) => s.say.trim() && s.say.length < 300));
  assert.equal(walkScenes.at(-1)!.id, "cta");
  const est = walkDurations();
  assert.equal(est.length, walkScenes.length);
  assert.ok(est.every((d) => d >= 2.8));
  assert.equal(walkDurations(walkScenes.map(() => 3))[0], 3.8);
});

test("footage: picks a vertical MP4 near 720 px, long enough, never the same clip twice", async () => {
  const { pickClip, pickFile } = await import("../lib/video/footage");
  const file = (width: number, height: number, type = "video/mp4") => ({ width, height, type, link: `https://cdn.example.com/${width}x${height}.mp4` });
  assert.equal(pickFile([file(2160, 3840), file(1080, 1920), file(720, 1280), file(360, 640)])!.width, 720);
  assert.equal(pickFile([file(1920, 1080), file(720, 1280, "video/webm")]), undefined, "landscape and non-MP4 files are skipped by default");
  assert.equal(pickFile([file(3840, 2160), file(1920, 1080), file(1280, 720)], true)!.height, 1080, "landscape fallback prefers 1080p");
  const cand = (id: number, duration: number, files = [file(720, 1280)]) => ({ id, duration, credit: `Creator ${id}`, pageUrl: `https://pixabay.com/videos/${id}/`, source: "Pixabay" as const, files });
  const clip = pickClip([cand(1, 20), cand(2, 3), cand(3, 12)], 5, new Set([1]));
  assert.deepEqual(clip, { id: 3, src: "https://cdn.example.com/720x1280.mp4", credit: "Creator 3", pageUrl: "https://pixabay.com/videos/3/", source: "Pixabay" });
  const wideOnly = pickClip([cand(4, 30, [file(1920, 1080)]), cand(5, 30, [file(1280, 720)])], 5, new Set());
  assert.equal(wideOnly!.id, 4, "with no vertical clip, a landscape one is used");
  const vertLater = pickClip([cand(6, 30, [file(1920, 1080)]), cand(7, 30)], 5, new Set());
  assert.equal(vertLater!.id, 7, "a vertical clip anywhere in the results beats a landscape one");
});

test("footage search: Pexels first, else Pixabay, both normalised", async () => {
  const { searchFootage, footageProvider } = await import("../lib/video/footage");
  const realFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    urls.push(url);
    if (url.startsWith("https://api.pexels.com/")) return new Response(JSON.stringify({ videos: [{ id: 9, url: "https://www.pexels.com/video/9/", duration: 10, user: { name: "Asha" }, video_files: [{ file_type: "video/mp4", width: 720, height: 1280, link: "https://videos.pexels.com/9.mp4" }] }] }));
    return new Response(JSON.stringify({ hits: [{ id: 8, pageURL: "https://pixabay.com/videos/8/", duration: 12, user: "ravi", videos: { large: { url: "", width: 0, height: 0 }, medium: { url: "https://cdn.pixabay.com/8.mp4", width: 1280, height: 720 } } }] }));
  }) as unknown as typeof fetch;
  try {
    delete process.env.PEXELS_API_KEY; delete process.env.PIXABAY_API_KEY;
    assert.equal(footageProvider(), null);
    await assert.rejects(searchFootage("tea"));
    process.env.PIXABAY_API_KEY = "pb";
    const pb = await searchFootage("masala chai");
    assert.match(urls.at(-1)!, /^https:\/\/pixabay\.com\/api\/videos\/\?key=pb&q=masala\+chai/);
    assert.deepEqual(pb[0].files, [{ width: 1280, height: 720, link: "https://cdn.pixabay.com/8.mp4", type: "video/mp4" }]);
    assert.equal(pb[0].source, "Pixabay");
    process.env.PEXELS_API_KEY = "px";
    const px = await searchFootage("tea");
    assert.match(urls.at(-1)!, /^https:\/\/api\.pexels\.com\/v1\/videos\/search\?query=tea&orientation=portrait/);
    assert.equal(px[0].credit, "Asha");
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.PEXELS_API_KEY; delete process.env.PIXABAY_API_KEY;
  }
});

test("sample media route: 404 for unknown samples, 503 without a footage key", async () => {
  const { GET } = await import("../app/api/sample-media/[sample]/route");
  const call = (sample: string) => GET(new Request("http://x"), { params: Promise.resolve({ sample }) });
  assert.equal((await call("nope")).status, 404);
  delete process.env.PEXELS_API_KEY; delete process.env.PIXABAY_API_KEY;
  assert.equal((await call("dental")).status, 503);
  assert.ok(samples.every((s) => s.scenes.every((x) => x.footage.trim())), "every scene has a search phrase");
});
