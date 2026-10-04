import "./helpers";
import assert from "node:assert/strict";
import { test } from "node:test";
import { one, query } from "../lib/db";
import { approve, getItem, processDeadlines, requestChanges, sendForReview } from "../lib/pipeline";

delete process.env.RESEND_API_KEY;

async function newItem(script = "") {
  const client = await one<{ id: number }>(
    "INSERT INTO clients (slug, name, plan, lead_key) VALUES ($1, 'Test Co', 'growth', $1) RETURNING id",
    [`c${Math.random().toString(36).slice(2)}`],
  );
  const row = await one<{ id: number }>(
    "INSERT INTO content_items (client_id, title, script, stage) VALUES ($1, 'Test video', $2, 'script') RETURNING id",
    [client!.id, script],
  );
  return (await getItem(row!.id))!;
}

test("a script can't be sent for approval while it is empty", async () => {
  const item = await newItem("");
  assert.match((await sendForReview(item, "script", "Admin")) ?? "", /Write the script/);
  assert.equal((await getItem(item.id))!.review, null);
});

test("approving a script moves the video into production", async () => {
  const item = await newItem("Hook. Point. Call to action.");
  assert.equal(await sendForReview(item, "script", "Admin"), null);
  assert.equal((await getItem(item.id))!.review, "script");
  assert.equal(await approve(item.id, "Client"), "script");
  const after = (await getItem(item.id))!;
  assert.equal(after.stage, "production");
  assert.equal(after.review, null);
  assert.ok(after.script_approved_at);
});

test("requesting changes sends the script back with the client's note", async () => {
  const item = await newItem("First draft.");
  await sendForReview(item, "script", "Admin");
  assert.equal(await requestChanges(item.id, "Client", "Mention the Diwali offer"), "script");
  const after = (await getItem(item.id))!;
  assert.equal(after.stage, "script");
  assert.equal(after.changes_requested, "Mention the Diwali offer");
  assert.equal(await approve(item.id, "Client"), null, "nothing left to approve");
});

test("auto-approve: after 48 hours yes, before 48 hours no", async () => {
  const late = await newItem("Waited too long.");
  const early = await newItem("Still has time.");
  await sendForReview(late, "script", "Admin");
  await sendForReview(early, "script", "Admin");
  await query("UPDATE content_items SET review_requested_at = now() - interval '49 hours' WHERE id = $1", [late.id]);
  await query("UPDATE content_items SET review_requested_at = now() - interval '47 hours' WHERE id = $1", [early.id]);
  await processDeadlines();
  assert.equal((await getItem(late.id))!.stage, "production");
  assert.equal((await getItem(early.id))!.review, "script");
  const events = await query<{ body: string }>("SELECT body FROM content_events WHERE item_id = $1", [late.id]);
  assert.ok(events.some((e) => /approved automatically/.test(e.body)));
});
