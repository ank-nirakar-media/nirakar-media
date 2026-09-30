import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { emailConfigured, emailFrom } from "@/lib/email";
import { AUTO_APPROVE_HOURS, formatTime } from "@/lib/pipeline";
import { REMINDER_AFTER_HOURS, teamRecipients } from "@/lib/notify";
import { sendTestEmail } from "../../../email-actions";

export const metadata: Metadata = { title: "Emails", robots: { index: false } };

const testMessages: Record<string, string> = {
  sent: "Test email sent. Check the inbox (and spam, the first time).",
  skipped: "Not sent: RESEND_API_KEY isn't set in Vercel yet.",
  failed: "Resend refused it. The reason is in the log below.",
  bad: "Enter a valid email address.",
};

export default async function AdminEmails({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const user = await requireAdmin();
  const { test } = await searchParams;
  const team = await teamRecipients();
  const log = await query<{ id: number; to_email: string; subject: string; status: string; error: string; item_id: number | null; created_at: string }>(
    "SELECT id, to_email, subject, status, error, item_id, created_at::text FROM email_log ORDER BY id DESC LIMIT 50");
  const on = emailConfigured();

  return (
    <section className="wrap section-tight stack" style={{ gap: 22 }}>
      <div><p className="eyebrow">Admin · <Link href="/admin">Clients</Link></p><h1 className="portal-title">Emails</h1></div>

      <div className="grid-2">
        <div className="card stack" style={{ gap: 10 }}>
          <h3>Status</h3>
          <p><span className={`conn-status${on ? "" : " error"}`}>{on ? "Sending is on" : "Not sending yet"}</span></p>
          <p className="fine">From: {emailFrom()}</p>
          <p className="fine">Client replies go to: {team.join(", ") || "no admin emails found"}</p>
          {!on && <p className="fine">Add RESEND_API_KEY in Vercel to start sending. Until then every email is recorded below as &quot;skipped&quot;.</p>}
        </div>
        <form action={sendTestEmail} className="card form">
          <h3>Send a test</h3>
          {test && testMessages[test] && <p className="notice notice-inline" role="status">{testMessages[test]}</p>}
          <div className="field"><label htmlFor="to">Send to</label><input id="to" name="to" type="email" defaultValue={user.email} /></div>
          <div><button className="btn btn-ghost btn-sm" type="submit">Send test email</button></div>
        </form>
      </div>

      <div className="card stack" style={{ gap: 8 }}>
        <h3>What gets sent</h3>
        <ul className="plain-list fine">
          <li>To the client: a script or video is ready to approve.</li>
          <li>To the client: a reminder after {REMINDER_AFTER_HOURS} hours if they haven&apos;t answered.</li>
          <li>To the client and you: it was approved automatically after {AUTO_APPROVE_HOURS} hours.</li>
          <li>To the client: a message you send on an item (not internal notes).</li>
          <li>To you: the client approved, asked for changes or sent a message.</li>
        </ul>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">When</th><th scope="col">To</th><th scope="col">Subject</th><th scope="col">Result</th></tr></thead>
          <tbody>
            {log.map((e) => (
              <tr key={e.id}>
                <td>{formatTime(e.created_at)}</td>
                <td>{e.to_email}</td>
                <td>{e.item_id ? <Link href={`/admin/content/${e.item_id}`}>{e.subject}</Link> : e.subject}</td>
                <td><span className={`conn-status${e.status === "sent" ? "" : " error"}`}>{e.status}</span>{e.error && <span className="fine"> {e.error}</span>}</td>
              </tr>
            ))}
            {!log.length && <tr><td colSpan={4}>No emails yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
