// The one place the site talks to Claude. Every call asks for JSON that matches a schema,
// is logged to ai_runs with its token count and cost, and never throws: callers get either
// the parsed result or a short error they can show.
import Anthropic from "@anthropic-ai/sdk";
import { query } from "../db";

export const aiModel = () => process.env.AI_MODEL || "claude-opus-5-5";
export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

// US dollars per million tokens (input, output). A model not listed is logged at Opus 5.5 rates.
const prices: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-opus-5": [5, 25],
  "claude-opus-4-8": [5, 25],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
};
export const USD_TO_INR = 85;

export type Effort = "low" | "medium" | "high";
export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };

type Call = {
  kind: string;
  clientId?: number;
  itemId?: number;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  effort?: Effort;
  maxTokens?: number;
  // Optional overrides for chat: another model, earlier turns (prompt is the newest user turn),
  // and caching the system prompt, which stays the same on every turn.
  model?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  cacheSystem?: boolean;
};

// Haiku 4.5 rejects output_config.effort, and server-side fallbacks are only offered for the
// larger models, so both are sent only to models that take them.
const isHaiku = (model: string) => model.startsWith("claude-haiku");

// The API reports dated ids such as claude-haiku-4-5-20251001, so match on the longest known prefix.
export function priceFor(model: string): [number, number] {
  const key = Object.keys(prices).filter((k) => model.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return prices[key ?? "claude-opus-5-5"];
}

let client: Anthropic | undefined;
const anthropic = () => (client ??= new Anthropic({ timeout: 110_000, maxRetries: 1 }));

async function log(c: Call, model: string, status: string, usage: { input_tokens?: number | null; output_tokens?: number | null } | undefined, error = "") {
  const input = usage?.input_tokens ?? 0;
  const output = usage?.output_tokens ?? 0;
  const [pin, pout] = priceFor(model);
  const cost = (input * pin + output * pout) / 1e6;
  await query(
    `INSERT INTO ai_runs (client_id, item_id, kind, model, status, input_tokens, output_tokens, cost_usd, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [c.clientId ?? null, c.itemId ?? null, c.kind, model, status, input, output, cost.toFixed(4), error.slice(0, 500)],
  ).catch(() => {});
}

export async function generateJson<T>(c: Call): Promise<AiResult<T>> {
  const model = c.model || aiModel();
  if (!aiConfigured()) {
    await log(c, model, "skipped", undefined, "ANTHROPIC_API_KEY is not set");
    return { ok: false, error: "AI isn't set up yet. Add ANTHROPIC_API_KEY in Vercel." };
  }
  try {
    const haiku = isHaiku(model);
    const res = await anthropic().beta.messages.create({
      model,
      max_tokens: c.maxTokens ?? 16000,
      ...(haiku ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }),
      output_config: { ...(haiku ? {} : { effort: c.effort ?? "medium" }), format: { type: "json_schema", schema: c.schema } },
      system: c.cacheSystem ? [{ type: "text", text: c.system, cache_control: { type: "ephemeral" } }] : c.system,
      messages: [...(c.history ?? []), { role: "user", content: c.prompt }],
    });
    if (res.stop_reason === "refusal") {
      await log(c, res.model, "refused", res.usage, res.stop_details?.explanation ?? "");
      return { ok: false, error: "The AI declined this request. Try rewording the brief." };
    }
    if (res.stop_reason === "max_tokens") {
      await log(c, res.model, "failed", res.usage, "Hit max_tokens");
      return { ok: false, error: "The draft came out too long. Try again with a shorter brief." };
    }
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const data = JSON.parse(text) as T;
    await log(c, res.model, "ok", res.usage);
    return { ok: true, data };
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? e.status : undefined;
    const message =
      e instanceof Anthropic.AuthenticationError ? "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in Vercel."
      : e instanceof Anthropic.RateLimitError ? "The AI is busy right now. Try again in a minute."
      : e instanceof SyntaxError ? "The AI reply couldn't be read. Try again."
      : e instanceof Anthropic.APIConnectionTimeoutError ? "The AI took too long. Try again."
      : "The AI request failed. Try again, and check Admin > AI if it keeps happening.";
    await log(c, model, "failed", undefined, `${status ?? ""} ${e instanceof Error ? e.message : String(e)}`.trim());
    return { ok: false, error: message };
  }
}
