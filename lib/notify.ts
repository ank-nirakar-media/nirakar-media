// Who gets told what, by email. Clients hear when something needs their approval, when it is
// about to auto-approve, and when the team messages them. The team hears every client reply.
import { query } from "./db";
import { sendEmail } from "./email";
import { AUTO_APPROVE_HOURS, autoApproveAt, formatTime, reviewLabel, type Item, type Review } from "./pipeline";
import { configuredSiteUrl } from "./site-url";

export const REMINDER_AFTER_HOURS = 24;
const site = () => configuredSiteUrl() ?? "https://www.nirakarmedia.com";
const clientLink = (i: Pick<Item, "id" | "client_slug">) => `${site()}/portal/c/${i.client_slug}/content/${i.id}`;
const adminLink = (i: Pick<Item, "id">) => `${site()}/admin/content/${i.id}`;

// Client users who have set a password (invited-only users can't log in yet).
async function clientRecipients(clientId: number) {
  const rows = await query<{ email: string }>("SELECT email FROM users WHERE client_id = $1 AND password_hash IS NOT NULL ORDER BY id", [clientId]);
  return rows.map((r) => r.email);
}

// TEAM_EMAIL (comma-separated) if set, otherwise every admin login.
export async function teamRecipients() {
  const fromEnv = (process.env.TEAM_EMAIL || "").split(",").map((s) => s.trim()).filter((s) => s.includes("@"));
  if (fromEnv.length) return fromEnv;
  return (await query<{ email: string }>("SELECT email FROM users WHERE role = 'admin' ORDER BY id")).map((r) => r.email);
}

async function sendAll(to: string[], mail: Omit<Parameters<typeof sendEmail>[0], "to">) {
  for (const t of to) await sendEmail({ ...mail, to: t });
}

type ItemRef = Pick<Item, "id" | "title" | "client_id" | "client_slug" | "client_name">;

export async function notifyReviewRequested(item: ItemRef, kind: Review) {
  const due = new Date(Date.now() + AUTO_APPROVE_HOURS * 36e5).toISOString();
  await sendAll(await clientRecipients(item.client_id), {
    kind: `review-${kind}`,
    itemId: item.id,
    subject: `${reviewLabel(kind)} ready for your approval: ${item.title}`,
    heading: kind === "script" ? "Your script is ready to review" : "Your video is ready to review",
    lines: [
      `"${item.title}" is ready for you. Approve it or tell us what to change.`,
      `If we don't hear from you by ${formatTime(due)} (IST), we'll treat it as approved so your content stays on schedule.`,
    ],
    button: { label: `Review the ${kind}`, url: clientLink(item) },
  });
}

export async function notifyTeamOfClient(item: ItemRef, what: "approved" | "changes" | "message", actor: string, body = "", kind?: Review) {
  const subject =
    what === "approved" ? `${item.client_name} approved the ${kind}: ${item.title}`
    : what === "changes" ? `${item.client_name} asked for changes: ${item.title}`
    : `New message from ${item.client_name}: ${item.title}`;
  await sendAll(await teamRecipients(), {
    kind: `team-${what}`,
    itemId: item.id,
    subject,
    heading: subject,
    lines: [
      what === "approved" ? `${actor} approved the ${kind}. ${kind === "script" ? "It has moved to production." : "It has moved to scheduled."}` : `${actor} wrote:`,
      ...(body ? [body] : []),
    ],
    button: { label: "Open in admin", url: adminLink(item) },
  });
}

export async function notifyClientMessage(item: ItemRef, body: string) {
  await sendAll(await clientRecipients(item.client_id), {
    kind: "client-message",
    itemId: item.id,
    subject: `New message about "${item.title}"`,
    heading: "Your growth manager sent you a message",
    lines: [body],
    button: { label: "Open and reply", url: clientLink(item) },
  });
}

async function itemRefs(ids: number[]) {
  if (!ids.length) return [];
  return query<ItemRef & { review: Review | null; review_requested_at: string | null }>(
    `SELECT i.id, i.title, i.client_id, c.slug AS client_slug, c.name AS client_name, i.review, i.review_requested_at::text
     FROM content_items i JOIN clients c ON c.id = i.client_id WHERE i.id = ANY($1::int[])`,
    [ids],
  );
}

export async function notifyAutoApproved(done: { id: number; review: Review }[]) {
  const refs = await itemRefs(done.map((d) => d.id));
  const team = refs.length ? await teamRecipients() : [];
  for (const r of refs) {
    const kind = done.find((d) => d.id === r.id)!.review;
    const subject = `${reviewLabel(kind)} auto-approved: ${r.title}`;
    await sendAll(await clientRecipients(r.client_id), {
      kind: "auto-approved", itemId: r.id, subject, heading: subject,
      lines: [`We didn't hear back within ${AUTO_APPROVE_HOURS} hours, so we approved the ${kind} for "${r.title}" and moved it forward. You can still message us about it.`],
      button: { label: "Open it", url: clientLink(r) },
    });
    await sendAll(team, {
      kind: "team-auto-approved", itemId: r.id, subject: `${r.client_name}: ${subject}`, heading: `${r.client_name}: ${subject}`,
      lines: [`No reply within ${AUTO_APPROVE_HOURS} hours, so the ${kind} was approved automatically.`],
      button: { label: "Open in admin", url: adminLink(r) },
    });
  }
}

// One reminder per approval request, once it has waited REMINDER_AFTER_HOURS. The UPDATE claims the
// items first, so two page loads at the same moment can't send the reminder twice.
export async function sendReminders() {
  const claimed = await query<{ id: number }>(
    `UPDATE content_items SET reminded_at = now()
     WHERE review IS NOT NULL
       AND review_requested_at < now() - interval '${REMINDER_AFTER_HOURS} hours'
       AND review_requested_at > now() - interval '${AUTO_APPROVE_HOURS} hours'
       AND (reminded_at IS NULL OR reminded_at < review_requested_at)
     RETURNING id`,
  );
  for (const r of await itemRefs(claimed.map((c) => c.id))) {
    if (!r.review) continue;
    const due = autoApproveAt(r);
    await sendAll(await clientRecipients(r.client_id), {
      kind: "reminder", itemId: r.id,
      subject: `Reminder: ${r.review} waiting for your approval: ${r.title}`,
      heading: `Your ${r.review} is still waiting for you`,
      lines: [
        `"${r.title}" needs your approval.`,
        due ? `If we don't hear from you by ${formatTime(due.toISOString())} (IST), it will be approved automatically.` : "",
      ].filter(Boolean),
      button: { label: `Review the ${r.review}`, url: clientLink(r) },
    });
  }
  return claimed.length;
}
