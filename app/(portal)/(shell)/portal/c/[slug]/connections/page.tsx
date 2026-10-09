import type { Metadata } from "next";
import Link from "next/link";
import { requireClientAccess } from "@/lib/auth";
import { query } from "@/lib/db";
import { metaConfigured } from "@/lib/connectors/instagram";
import { youtubeConfigured } from "@/lib/connectors/youtube";
import { disconnect, syncNow } from "../../../../../actions";

export const metadata: Metadata = { title: "Connected accounts", robots: { index: false } };

type Conn = { id: number; platform: string; account_name: string; status: string; last_error: string | null; last_synced_at: string | null };

export default async function Connections({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ connected?: string; error?: string; synced?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { client } = await requireClientAccess(slug);
  const conns = await query<Conn>(
    "SELECT id, platform, account_name, status, last_error, last_synced_at::text FROM connections WHERE client_id = $1 AND status <> 'disconnected' ORDER BY platform",
    [client.id],
  );
  const providers = [
    { id: "youtube", name: "YouTube", ready: youtubeConfigured(), text: "Views, likes, comments, subscribers and search traffic for your channel, and permission to upload the videos you approve." },
    { id: "instagram", name: "Instagram", ready: metaConfigured(), text: "Reels views, likes, comments, shares, saves and followers, and permission to post the Reels you approve. Needs a professional account linked to a Facebook Page." },
  ];
  return (
    <section className="wrap section-tight stack" style={{ gap: 20, maxWidth: 900 }}>
      <div className="portal-head">
        <div>
          <p className="eyebrow">{client.name}</p>
          <h1 className="portal-title">Connected accounts</h1>
        </div>
        <Link href={`/portal/c/${slug}`} className="btn btn-ghost btn-sm">Back to dashboard</Link>
      </div>
      <p className="muted">
        We read your statistics and post only the videos you have approved (or that approved themselves after 48 hours), on
        their publish date. We never delete anything or send messages, and you can disconnect at any time. Connected before
        posting was added? Press Reconnect and allow posting.
      </p>
      {sp.connected && <p className="notice" role="status">Connected {sp.connected}. Your numbers are loading.</p>}
      {sp.synced && <p className="notice" role="status">Sync finished.</p>}
      {sp.error && <p className="notice" role="alert">{sp.error}</p>}

      <div className="stack" style={{ gap: 12 }}>
        {providers.map((p) => {
          const mine = conns.filter((c) => c.platform === p.id);
          return (
            <div key={p.id} className="card">
              <div className="portal-head">
                <div><h3>{p.name}</h3><p>{p.text}</p></div>
                {p.ready ? (
                  <a href={`/api/connect/${p.id}/start?client=${slug}`} className="btn btn-primary btn-sm">{mine.length ? "Reconnect" : "Connect"}</a>
                ) : (
                  <span className="tier-tag">Being set up</span>
                )}
              </div>
              {mine.map((c) => (
                <div key={c.id} className="conn-row">
                  <div>
                    <b>{c.account_name}</b>
                    <span className={`conn-status ${c.status}`}>{c.status === "active" ? "Connected" : "Needs attention"}</span>
                    <span className="muted">{c.last_synced_at ? ` · updated ${new Date(c.last_synced_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : " · not synced yet"}</span>
                    {c.last_error && <p className="fine">{c.last_error}</p>}
                  </div>
                  <form action={disconnect}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="id" value={c.id} />
                    <button className="btn btn-ghost btn-sm" type="submit">Disconnect</button>
                  </form>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {conns.length > 0 && (
        <form action={syncNow}>
          <input type="hidden" name="slug" value={slug} />
          <button className="btn btn-ghost" type="submit">Sync now</button>
        </form>
      )}
    </section>
  );
}
