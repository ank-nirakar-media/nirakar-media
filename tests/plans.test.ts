import assert from "node:assert/strict";
import { test } from "node:test";
import { formatInr, getPlan, plans } from "../lib/plans";

// The prices agreed with the business. A change here must be deliberate.
test("plan prices match the agreed pricing", () => {
  assert.deepEqual(
    plans.map((p) => [p.id, p.priceInr]),
    [["starter", 4999], ["growth", 14999], ["pro", 34999]],
  );
});

test("getPlan finds known plans and rejects unknown ones", () => {
  assert.equal(getPlan("growth")?.name, "Growth");
  assert.equal(getPlan("enterprise"), undefined);
});

test("formatInr uses Indian rupee formatting", () => {
  assert.equal(formatInr(14999), "₹14,999");
  assert.equal(formatInr(100000), "₹1,00,000");
});
