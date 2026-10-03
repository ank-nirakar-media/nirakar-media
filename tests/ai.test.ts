import "./helpers";
import assert from "node:assert/strict";
import { test } from "node:test";
import { query } from "../lib/db";
import { generateJson } from "../lib/ai/claude";

test("without an API key the AI call fails safely and is logged as skipped", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const res = await generateJson({ kind: "test", system: "s", prompt: "p", schema: { type: "object" } });
  assert.deepEqual(res, { ok: false, error: "AI isn't set up yet. Add ANTHROPIC_API_KEY in Vercel." });
  const [run] = await query<{ status: string }>("SELECT status FROM ai_runs WHERE kind = 'test'");
  assert.equal(run.status, "skipped");
});
