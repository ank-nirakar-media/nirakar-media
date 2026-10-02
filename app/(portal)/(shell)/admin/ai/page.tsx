import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { aiConfigured, aiModel, USD_TO_INR } from "@/lib/ai/claude";
import { aiUsage } from "@/lib/ai/studio";
import { formatTime } from "@/lib/pipeline";

export const metadata: Metadata = { title: "AI", robots: { index: false } };

const kinds: Record<string, string> = { ideas: "Ideas", script: "Script", "script-revision": "Script revision" };
const inr = (usd: number) => `₹${(usd * USD_TO_INR).toLocaleString("en-IN", { maximumFractionDigits: usd * USD_TO_INR < 10 ? 1 : 0 })}`;

export default async function AdminAi() {
  await requireAdmin();
  const on = aiConfigured();
  const { runs, costUsd, log } = await aiUsage();

  return (
    <section className="wrap section-tight stack" style={{ gap: 22 }}>
      <div><p className="eyebrow">Admin · <Link href="/admin">Clients</Link></p><h1 className="portal-title">AI</h1></div>

      <div className="grid-2">
        <div className="card stack" style={{ gap: 10 }}>
          <h3>Status</h3>
          <p><span className={`conn-status${on ? "" : " error"}`}>{on ? "AI drafting is on" : "Not set up yet"}</span></p>
          <p className="fine">Model: {aiModel()}</p>
          {!on && <p className="fine">Create a key at console.anthropic.com, then add it in Vercel as ANTHROPIC_API_KEY and redeploy.</p>}
        </div>
        <div className="card stack" style={{ gap: 10 }}>
          <h3>This month</h3>
          <div className="stat-row"><b>{runs}</b><span className="muted">AI drafts</span></div>
          <div className="stat-row"><b>{inr(costUsd)}</b><span className="muted">about ${costUsd.toFixed(2)} in API cost</span></div>
          <p className="fine">Rupee figures use ₹{USD_TO_INR} to the dollar. Your Anthropic bill is the exact amount.</p>
        </div>
      </div>

      <div className="card stack" style={{ gap: 8 }}>
        <h3>What AI does here</h3>
        <ul className="plain-list fine">
          <li>Content &gt; Suggest ideas with AI: new video ideas from a client&apos;s Brand Brain, added to the Idea column.</li>
          <li>On a content item: a script, scene plan and post caption, or a redraft from the client&apos;s change request.</li>
          <li>Everything is a draft. Nothing reaches a client until you send it for approval.</li>
        </ul>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">When</th><th scope="col">What</th><th scope="col">Client</th><th scope="col">Cost</th><th scope="col">Result</th></tr></thead>
          <tbody>
            {log.map((r) => (
              <tr key={r.id}>
                <td>{formatTime(r.created_at)}</td>
                <td>{r.item_id ? <Link href={`/admin/content/${r.item_id}`}>{kinds[r.kind] ?? r.kind}</Link> : kinds[r.kind] ?? r.kind}</td>
                <td>{r.client_name ?? ""}</td>
                <td>{Number(r.cost_usd) > 0 ? inr(Number(r.cost_usd)) : ""}</td>
                <td><span className={`conn-status${r.status === "ok" ? "" : " error"}`}>{r.status}</span>{r.error && <span className="fine"> {r.error}</span>}</td>
              </tr>
            ))}
            {!log.length && <tr><td colSpan={5}>No AI drafts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
