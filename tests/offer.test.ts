import "./helpers";
import assert from "node:assert/strict";
import { test } from "node:test";
import { query } from "../lib/db";
import { knowledgePack } from "../lib/ask/knowledge";
import { offerStatus, recordSubscription, seatsTaken, setSubscriptionStatus } from "../lib/offer";
import { getPlan, launchOffer, offerOpen, plans, priceInr } from "../lib/plans";
import { planAmountInr, planName } from "../lib/razorpay";

const before = new Date("2026-10-08T12:00:00+05:30");
const after = new Date("2027-01-01T00:00:00+05:30");

// The founding offer agreed with the owner on 2026-10-08. A change here must be deliberate.
test("founding offer: 20 seats at ₹999 / ₹5,999 / ₹14,999 until 31 December 2026", () => {
  assert.equal(launchOffer.seats, 20);
  assert.deepEqual(plans.map((p) => [p.id, launchOffer.priceInr[p.id]]), [["starter", 999], ["growth", 5999], ["pro", 14999]]);
  assert.equal(launchOffer.endsAt, "2026-12-31T23:59:59+05:30");
});

test("the offer is open only while seats are left and before the end date", () => {
  assert.equal(offerOpen(0, before), true);
  assert.equal(offerOpen(19, before), true);
  assert.equal(offerOpen(20, before), false);
  assert.equal(offerOpen(0, new Date("2026-12-31T23:59:00+05:30")), true);
  assert.equal(offerOpen(0, after), false);
});

test("offer prices flow into the Razorpay plan name and amount", () => {
  const growth = getPlan("growth")!;
  assert.equal(priceInr(growth, true), 5999);
  assert.equal(priceInr(growth, false), 14999);
  assert.equal(planAmountInr(growth, 1, true), 5999 + 2499);
  assert.equal(planAmountInr(growth, 1, false), 14999 + 2499);
  assert.equal(planName(growth, 0, true), "Nirakar Media Growth (founding offer)");
  assert.equal(planName(growth, 0, false), "Nirakar Media Growth");
});

test("a seat is taken only once the first payment goes through", async () => {
  await recordSubscription("sub_offer_1", "starter", true);
  await recordSubscription("sub_offer_2", "growth", true);
  await recordSubscription("sub_list_1", "pro", false);
  assert.equal(await seatsTaken(), 0);

  await setSubscriptionStatus("sub_offer_1", "authenticated", true);
  await setSubscriptionStatus("sub_list_1", "active", true);
  assert.equal(await seatsTaken(), 1);

  // A later status change keeps the seat and the first activation time.
  const [{ activated_at: first }] = await query<{ activated_at: string }>("SELECT activated_at::text FROM subscriptions WHERE id = 'sub_offer_1'");
  await setSubscriptionStatus("sub_offer_1", "cancelled");
  const [row] = await query<{ status: string; activated_at: string }>("SELECT status, activated_at::text FROM subscriptions WHERE id = 'sub_offer_1'");
  assert.equal(row.status, "cancelled");
  assert.equal(row.activated_at, first);
  assert.equal(await seatsTaken(), 1);
  assert.deepEqual(await offerStatus(before), { open: true, seatsLeft: 19 });
});

test("the offer closes when all 20 seats are taken", async () => {
  await query("DELETE FROM subscriptions");
  for (let i = 0; i < launchOffer.seats; i++) {
    await recordSubscription(`sub_full_${i}`, "starter", true);
    await setSubscriptionStatus(`sub_full_${i}`, "active", true);
  }
  assert.deepEqual(await offerStatus(before), { open: false, seatsLeft: 0 });
  await query("DELETE FROM subscriptions");
});

test("Ask Purple knows the offer before the end date and drops it after", () => {
  const open = knowledgePack(before);
  assert.ok(open.includes("Founding offer: ₹5,999 a month instead of ₹14,999."));
  assert.ok(open.includes("31 December 2026"));
  const closed = knowledgePack(after);
  assert.ok(!closed.includes("Founding offer"));
  assert.ok(closed.includes("Growth: ₹14,999 a month"));
});
