import assert from "node:assert/strict";
import crypto from "node:crypto";
import { afterEach, test } from "node:test";
import { razorpayKeyStatus, verifyPaymentSignature, verifyWebhookSignature } from "../lib/razorpay";

const hmac = (secret: string, body: string) => crypto.createHmac("sha256", secret).update(body).digest("hex");
const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
});

test("checkout signature: accepts Razorpay's signature, rejects a forged one", () => {
  process.env.RAZORPAY_KEY_SECRET = "test_secret_24_chars_xxx";
  const good = hmac("test_secret_24_chars_xxx", "pay_1|sub_1");
  assert.equal(verifyPaymentSignature("pay_1", "sub_1", good), true);
  assert.equal(verifyPaymentSignature("pay_1", "sub_2", good), false);
  assert.equal(verifyPaymentSignature("pay_1", "sub_1", "0".repeat(64)), false);
});

test("checkout signature ignores spaces pasted around the secret", () => {
  process.env.RAZORPAY_KEY_SECRET = "  test_secret_24_chars_xxx\n";
  assert.equal(verifyPaymentSignature("pay_1", "sub_1", hmac("test_secret_24_chars_xxx", "pay_1|sub_1")), true);
});

test("webhook signature: valid passes, tampered body or missing secret fails", () => {
  const body = JSON.stringify({ event: "subscription.activated" });
  process.env.RAZORPAY_WEBHOOK_SECRET = "whsec";
  assert.equal(verifyWebhookSignature(body, hmac("whsec", body)), true);
  assert.equal(verifyWebhookSignature(body + " ", hmac("whsec", body)), false);
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  assert.equal(verifyWebhookSignature(body, hmac("whsec", body)), false);
});

test("key status: missing when keys are not set", async () => {
  assert.deepEqual(await razorpayKeyStatus(), { status: "missing" });
});

test("key status: ok in test mode, never exposes the secret", async () => {
  process.env.RAZORPAY_KEY_ID = " rzp_test_abc ";
  process.env.RAZORPAY_KEY_SECRET = "s".repeat(24);
  let auth = "";
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    auth = String((init.headers as Record<string, string>).Authorization);
    return new Response('{"items":[],"count":0}', { status: 200 });
  }) as typeof fetch;
  const status = await razorpayKeyStatus();
  assert.deepEqual(status, { status: "ok", mode: "test", keyId: "rzp_test_abc", secretLength: 24 });
  assert.equal(auth, `Basic ${Buffer.from(`rzp_test_abc:${"s".repeat(24)}`).toString("base64")}`);
  assert.ok(!JSON.stringify(status).includes("s".repeat(24)));
});

test("key status: a 401 from Razorpay is reported as rejected", async () => {
  process.env.RAZORPAY_KEY_ID = "rzp_test_abc";
  process.env.RAZORPAY_KEY_SECRET = "wrong";
  globalThis.fetch = (async () => new Response('{"error":"Unauthorized"}', { status: 401 })) as typeof fetch;
  const status = await razorpayKeyStatus();
  assert.match(status.status, /^rejected .*401/);
});
