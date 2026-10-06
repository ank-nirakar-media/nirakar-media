import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { chatThread } from "@/lib/ask/sales";
import { formatTime } from "@/lib/pipeline";

export const metadata: Metadata = { title: "Chat", robots: { index: false } };

export default async function AdminChat({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const thread = await chatThread((await params).id);
  if (!thread) notFound();
  const { convo, messages } = thread;

  return (
    <section className="wrap section-tight stack" style={{ gap: 22 }}>
      <div><p className="eyebrow">Admin · <Link href="/admin/chats">Chats</Link></p><h1 className="portal-title">Chat from {formatTime(convo.created_at)}</h1></div>

      <div className="card stack" style={{ gap: 6 }}>
        <p className="fine">Started on {convo.page || "the website"}. Outcome: {convo.outcome}.</p>
        {convo.lead_email && (
          <p>Lead: {convo.lead_name} · <a href={`mailto:${convo.lead_email}`}>{convo.lead_email}</a>{convo.lead_phone && ` · ${convo.lead_phone}`}{convo.lead_need && <><br /><span className="fine">{convo.lead_need}</span></>}</p>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Message</th><th scope="col">Intent · action</th></tr></thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id}>
                <td>{formatTime(m.created_at)}</td>
                <td>{m.role === "user" ? "Visitor" : "Ask Purple"}</td>
                <td style={{ whiteSpace: "pre-line" }}>{m.body}</td>
                <td className="fine">
                  {m.role === "assistant" && [m.intent, m.action, m.plan].filter(Boolean).join(" · ")}
                  {m.status !== "ok" && <span className="conn-status error"> {m.status}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
