import crypto from "node:crypto";
import type { Plan } from "./plans";

// Minimal Razorpay REST client (no SDK needed). Keys come from env vars.
const API = process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1";

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

// Checks the keys against Razorpay without changing anything. Never returns the keys.
export async function razorpayKeyStatus(): Promise<{ status: string; mode?: string }> {
  if (!razorpayConfigured()) return { status: "missing" };
  const mode = process.env.RAZORPAY_KEY_ID!.startsWith("rzp_live_") ? "live" : process.env.RAZORPAY_KEY_ID!.startsWith("rzp_test_") ? "test" : "unknown";
  try {
    await call("GET", "/plans?count=1");
    return { status: "ok", mode };
  } catch (e) {
    return { status: `rejected (${(e as Error).message.slice(0, 80)})`, mode };
  }
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Razorpay ${method} ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data as T;
}

type RzpPlan = { id: string; item: { name: string; amount: number; currency: string }; period: string; interval: number };
type RzpList<T> = { items: T[]; count: number };
export type RzpSubscription = { id: string; status: string; short_url?: string; plan_id: string };

export function planName(plan: Plan, extraLanguages: number) {
  return extraLanguages > 0
    ? `Nirakar Media ${plan.name} + ${extraLanguages} extra language${extraLanguages > 1 ? "s" : ""}`
    : `Nirakar Media ${plan.name}`;
}

export function planAmountInr(plan: Plan, extraLanguages: number) {
  return plan.priceInr + extraLanguages * plan.extraLanguageInr;
}

// Razorpay subscriptions bill a fixed plan, so each plan + language combination
// is its own Razorpay plan. We find it by name and amount, and create it the
// first time someone buys that combination. Changing a price in lib/plans.ts
// therefore creates a new Razorpay plan; existing subscribers keep the old one.
export async function ensurePlan(plan: Plan, extraLanguages: number): Promise<string> {
  const name = planName(plan, extraLanguages);
  const amount = planAmountInr(plan, extraLanguages) * 100;
  for (let skip = 0; skip < 1000; skip += 100) {
    const page = await call<RzpList<RzpPlan>>("GET", `/plans?count=100&skip=${skip}`);
    const match = page.items.find(
      (p) => p.item.name === name && p.item.amount === amount && p.item.currency === "INR" && p.period === "monthly" && p.interval === 1,
    );
    if (match) return match.id;
    if (page.items.length < 100) break;
  }
  const created = await call<RzpPlan>("POST", "/plans", {
    period: "monthly",
    interval: 1,
    item: { name, amount, currency: "INR", description: plan.tagline },
    notes: { plan: plan.id, extraLanguages: String(extraLanguages) },
  });
  return created.id;
}

export async function createSubscription(planId: string, notes: Record<string, string>) {
  return call<RzpSubscription>("POST", "/subscriptions", {
    plan_id: planId,
    total_count: 120, // monthly for up to 10 years, or until the client cancels
    quantity: 1,
    customer_notify: 1,
    notes,
  });
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Checkout success: HMAC_SHA256(payment_id + "|" + subscription_id, key_secret)
export function verifyPaymentSignature(paymentId: string, subscriptionId: string, signature: string) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  return safeEqual(expected, signature);
}

// Webhooks: HMAC_SHA256(raw body, webhook secret) in X-Razorpay-Signature
export function verifyWebhookSignature(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return safeEqual(expected, signature);
}
