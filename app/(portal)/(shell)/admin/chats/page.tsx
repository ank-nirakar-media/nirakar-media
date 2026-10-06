import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai/claude";
import { askModel, chatLog, LIMITS } from "@/lib/ask/sales";
import { formatTime } from "@/lib/pipeline";

export const metadata: Metadata = { title: "Chats", robots: { index: false } };

const outcomes: Record<string, string> = { open: "Answered", checkout: "Sent to checkout", lead: "Lead saved", handover: "Needs you" };

export default async function AdminChats() {
  await requireAdmin();
  const chats = await chatLog();

  return (
    <section className="wrap section-tight stack" style={{ gap: 22 }}>
      <div><p className="eyebrow">Admin · <Link href="/admin">Clients</Link></p><h1 className="portal-title">Ask Purple chats</h1></div>

      <div className="card stack" style={{ gap: 8 }}>
        <p><span className={`conn-status${aiConfigured() ? "" : " error"}`}>{aiConfigured() ? "Ask Purple is on" : "Not set up: ANTHROPIC_API_KEY is missing"}</span></p>
        <p className="fine">
          Model: {askModel()}. Limits: {LIMITS.perConversation} messages a chat, {LIMITS.perVisitorPerDay} a visitor a day, ₹{LIMITS.dailyInr} of AI cost a day.
          Costs per message are in <Link href="/admin/ai">AI</Link>.
        </p>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Last message</th><th scope="col">First question</th><th scope="col">Messages</th><th scope="col">Lead</th><th scope="col">Outcome</th></tr></thead>
          <tbody>
            {chats.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/admin/chats/${c.id}`}>{formatTime(c.updated_at)}</Link></td>
                <td>{(c.first ?? "").slice(0, 90)}</td>
                <td>{c.messages}</td>
                <td>{c.lead_email ? `${c.lead_name} ${c.lead_email}`.trim() : ""}</td>
                <td><span className={`conn-status${c.outcome === "handover" ? " error" : ""}`}>{outcomes[c.outcome] ?? c.outcome}</span></td>
              </tr>
            ))}
            {!chats.length && <tr><td colSpan={5}>No chats yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
