import "./helpers";
import assert from "node:assert/strict";
import { test } from "node:test";
import { one } from "../lib/db";
import { brandColors, planFromScenes, safeColor } from "../lib/video/build";
import { captionGroups, estimateSeconds, layoutFor, LAYOUTS, planFrames, sceneFrames, timeWords } from "../lib/video/plan";
import { createSampleRequest, phoneKey, setSampleStatus } from "../lib/video/requests";
import { samplePlan, samples, WATERMARK } from "../lib/video/samples";

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
  assert.ok(mine.scenes.at(-1)!.words.some((w) => w.text === "Ankit"));
  assert.ok(!JSON.stringify(mine).includes("Smile Dental"));
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
