import crypto from "node:crypto";
import type { Plan } from "./plans";

// Minimal Razorpay REST client (no SDK needed). Keys come from env vars.
const API = process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1";

// Trimmed, because a space or line break pasted along with a key makes Razorpay answer 401.
export const razorpayKeyId = () => (process.env.RAZORPAY_KEY_ID ?? "").trim();
const keySecret = () => (process.env.RAZORPAY_KEY_SECRET ?? "").trim();
const webhookSecret = () => (process.env.RAZORPAY_WEBHOOK_SECRET ?? "").trim();

export function razorpayConfigured(): boolean {
  return Boolean(razorpayKeyId() && keySecret());
}

// Checks the keys against Razorpay without changing anything. Never returns the keys.
// The key ID is public (checkout shows it to every buyer), so it is safe to show here. The
// secret is never shown, only its length, which helps spot a wrong or half-copied paste.
export async function razorpayKeyStatus(): Promise<{ status: string; mode?: string; keyId?: string; secretLength?: number }> {
  if (!razorpayConfigured()) return { status: "missing" };
  const id = razorpayKeyId();
  const mode = id.startsWith("rzp_live_") ? "live" : id.startsWith("rzp_test_") ? "test" : "unknown";
  const info = { mode, keyId: id, secretLength: keySecret().length };
  try {
    await call("GET", "/plans?count=1");
    return { status: "ok", ...info };
  } catch (e) {
    return { status: `rejected (${(e as Error).message.slice(0, 80)})`, ...info };
  }
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const auth = Buffer.from(`${razorpayKeyId()}:${keySecret()}`).toString("base64");
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
    .createHmac("sha256", keySecret())
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  return safeEqual(expected, signature);
}

// Webhooks: HMAC_SHA256(raw body, webhook secret) in X-Razorpay-Signature
export function verifyWebhookSignature(body: string, signature: string) {
  const secret = webhookSecret();
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return safeEqual(expected, signature);
}
