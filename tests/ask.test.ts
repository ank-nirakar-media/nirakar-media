import "./helpers";
import assert from "node:assert/strict";
import { test } from "node:test";
import { query } from "../lib/db";
import { generateJson, priceFor } from "../lib/ai/claude";
import { allowedAmounts, knowledgePack } from "../lib/ask/knowledge";
import { askPurple, DISCLAIMER, inventedAmounts, LIMITS, systemPrompt } from "../lib/ask/sales";
import { formatInr, plans } from "../lib/plans";

type Gen = typeof generateJson;
const turn = (over: Record<string, unknown> = {}) => ({
  intent: "sales",
  reply: "Growth suits most businesses.",
  plan: "none",
  action: "none",
  lead: { name: "", email: "", phone: "", need: "" },
  ...over,
});
// A stand-in for Claude: returns the given turn and records what it was asked.
function fake(t: Record<string, unknown>, calls: unknown[] = []): Gen {
  return (async (c: unknown) => {
    calls.push(c);
    return { ok: true, data: t };
  }) as Gen;
}

test("the disclaimer is Ankit's exact wording", () => {
  assert.equal(
    DISCLAIMER,
    "Ask Purple is an AI assistant and can make mistakes. For binding terms, fees, refunds, and what is included in your order, see Terms of Service on nirakarmedia.com.",
  );
});

test("the knowledge pack carries every plan price from lib/plans.ts", () => {
  const pack = knowledgePack();
  for (const p of plans) {
    assert.ok(pack.includes(`${p.name}: ${formatInr(p.priceInr)} a month`), p.name);
    assert.ok(pack.includes(formatInr(p.extraLanguageInr)), `${p.name} extra language`);
  }
  assert.ok(systemPrompt().endsWith(pack));
});

test("only published rupee amounts are allowed in a reply", () => {
  assert.deepEqual([...allowedAmounts()].sort((a, b) => a - b), [0, 999, 2499, 3999, 4999, 14999, 34999]);
  assert.deepEqual(inventedAmounts("Growth is ₹14,999 a month, and an extra language is ₹2,499."), []);
  assert.deepEqual(inventedAmounts("For you, Growth is just ₹9,999!"), [9999]);
  assert.deepEqual(inventedAmounts("Pro costs Rs. 30000 or 25,000 rupees"), [30000, 25000]);
  assert.deepEqual(inventedAmounts("We make 16 videos a month in 2 languages."), []);
});

test("a reply with a made-up price is replaced before the visitor sees it", async () => {
  const res = await askPurple({ visitor: "visitor-price-0001", message: "any discount?" }, fake(turn({ reply: "Sure, Growth for ₹9,999." })));
  assert.ok(!res.reply.includes("9,999"));
  assert.ok(res.reply.includes("/pricing"));
  const [m] = await query<{ status: string }>("SELECT status FROM chat_messages WHERE conversation_id = $1 AND role = 'assistant'", [res.conversationId]);
  assert.equal(m.status, "blocked-price");
});

test("checkout is offered only for a real plan, with the price from lib/plans.ts", async () => {
  const ok = await askPurple({ visitor: "visitor-checkout-01", message: "I want Growth" }, fake(turn({ action: "show_checkout", plan: "growth" })));
  assert.deepEqual(ok.checkout, { plan: "growth", name: "Growth", price: formatInr(14999) });
  const none = await askPurple({ visitor: "visitor-checkout-02", message: "buy" }, fake(turn({ action: "show_checkout", plan: "none" })));
  assert.equal(none.checkout, undefined);
  const bogus = await askPurple({ visitor: "visitor-checkout-03", message: "buy" }, fake(turn({ action: "show_checkout", plan: "enterprise" })));
  assert.equal(bogus.checkout, undefined);
});

test("the Sales agent gets the history, the cached system prompt and the chat model", async () => {
  const calls: { prompt: string; history: unknown[]; cacheSystem: boolean; model: string; kind: string }[] = [];
  const gen = fake(turn(), calls);
  const first = await askPurple({ visitor: "visitor-history-01", message: "hello" }, gen);
  await askPurple({ visitor: "visitor-history-01", conversationId: first.conversationId, message: "which plan?" }, gen);
  assert.equal(calls[1].prompt, "which plan?");
  assert.deepEqual(calls[1].history, [
    { role: "user", content: "hello" },
    { role: "assistant", content: "Growth suits most businesses." },
  ]);
  assert.equal(calls[1].cacheSystem, true);
  assert.equal(calls[1].model, "claude-haiku-4-5");
  assert.equal(calls[1].kind, "ask");
});

test("another visitor cannot continue someone else's conversation", async () => {
  const a = await askPurple({ visitor: "visitor-owner-0001", message: "hi" }, fake(turn()));
  const b = await askPurple({ visitor: "visitor-other-0001", conversationId: a.conversationId, message: "hi" }, fake(turn()));
  assert.notEqual(b.conversationId, a.conversationId);
});

test("a lead with an email is saved, and a handover is marked for Ankit", async () => {
  const res = await askPurple(
    { visitor: "visitor-lead-00001", message: "I'm Priya, priya@example.com, call me" },
    fake(turn({ action: "handover", lead: { name: "Priya", email: "Priya@Example.com", phone: "", need: "Bakery videos" } })),
  );
  assert.equal(res.handedOver, true);
  const [c] = await query<{ lead_name: string; lead_email: string; outcome: string; handed_over_at: string | null }>(
    "SELECT lead_name, lead_email, outcome, handed_over_at::text FROM chat_conversations WHERE id = $1",
    [res.conversationId],
  );
  assert.equal(c.lead_name, "Priya");
  assert.equal(c.lead_email, "priya@example.com");
  assert.equal(c.outcome, "handover");
  assert.ok(c.handed_over_at);
  const mails = await query<{ kind: string }>("SELECT kind FROM email_log WHERE kind = 'ask-lead'");
  assert.equal(mails.length, 1);
});

test("a conversation stops at its message limit without calling the model", async () => {
  const calls: unknown[] = [];
  const gen = fake(turn(), calls);
  const first = await askPurple({ visitor: "visitor-limit-0001", message: "1" }, gen);
  for (let i = 2; i <= LIMITS.perConversation; i++) {
    await askPurple({ visitor: "visitor-limit-0001", conversationId: first.conversationId, message: String(i) }, gen);
  }
  assert.equal(calls.length, LIMITS.perConversation);
  const over = await askPurple({ visitor: "visitor-limit-0001", conversationId: first.conversationId, message: "one more" }, gen);
  assert.equal(over.limited, true);
  assert.equal(calls.length, LIMITS.perConversation);
});

test("the daily AI spend cap pauses the chat", async () => {
  // ₹300 at ₹85 to the dollar is about $3.53 of chat calls today.
  await query("INSERT INTO ai_runs (kind, model, status, cost_usd) VALUES ('ask', 'claude-haiku-4-5', 'ok', 3.6)");
  const calls: unknown[] = [];
  const res = await askPurple({ visitor: "visitor-spend-0001", message: "hi" }, fake(turn(), calls));
  assert.equal(res.limited, true);
  assert.equal(calls.length, 0);
  await query("DELETE FROM ai_runs WHERE kind = 'ask'");
});

test("without an API key the visitor gets a safe message pointing to the contact form", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const res = await askPurple({ visitor: "visitor-nokey-0001", message: "hi" });
  assert.ok(res.reply.includes("/contact"));
  const [run] = await query<{ status: string; model: string }>("SELECT status, model FROM ai_runs WHERE kind = 'ask' ORDER BY id DESC LIMIT 1");
  assert.equal(run.status, "skipped");
  assert.equal(run.model, "claude-haiku-4-5");
});

test("costs use the right price for dated model ids", () => {
  assert.deepEqual(priceFor("claude-haiku-4-5-20251001"), [1, 5]);
  assert.deepEqual(priceFor("claude-opus-5-5"), [4, 20]);
  assert.deepEqual(priceFor("claude-opus-5"), [5, 25]);
  assert.deepEqual(priceFor("something-new"), [4, 20]);
});
