import { configuredSiteUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { requireAdmin, requireClientAccess } from "@/lib/auth";
import { query } from "@/lib/db";
import { plans } from "@/lib/plans";
import { completeness, loadBrand, steps } from "@/lib/brand";
import { addOpportunity, createLink, inviteUser, setOpportunity, syncNow, tagVideo, updateClient } from "../../../../actions";

export const metadata: Metadata = { title: "Manage client", robots: { index: false } };

type Search = { invite?: string; email?: string; error?: string };

export default async function AdminClient({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Search> }) {
  await requireAdmin();
  const { slug } = await params;
  const sp = await searchParams;
  const { client } = await requireClientAccess(slug);
  const h = await headers();
  const origin = configuredSiteUrl() || `${h.get("x-forwarded-proto") || "http"}://${h.get("host")}`;

  const users = await query<{ email: string; name: string; password_hash: string | null }>("SELECT email, name, password_hash FROM users WHERE client_id = $1 ORDER BY email", [client.id]);
  const conns = await query<{ platform: string; account_name: string; status: string; last_error: string | null }>(
    "SELECT platform, account_name, status, last_error FROM connections WHERE client_id = $1 AND status <> 'disconnected'", [client.id]);
  const opps = await query<{ id: number; signal: string; location: string; action: string; published: boolean }>(
    "SELECT id, signal, location, action, published FROM opportunities WHERE client_id = $1 ORDER BY created_at DESC", [client.id]);
  const links = await query<{ code: string; label: string; target_url: string; clicks: number }>(
    `SELECT l.code, l.label, l.target_url, (SELECT count(*)::int FROM leads x WHERE x.client_id = l.client_id AND x.source = 'link:' || l.code) AS clicks
     FROM links l WHERE l.client_id = $1 ORDER BY l.created_at DESC`, [client.id]);
  const videos = await query<{ id: number; platform: string; title: string; topic: string | null; language: string | null; published_at: string }>(
    "SELECT id, platform, title, topic, language, published_at::text FROM videos WHERE client_id = $1 ORDER BY published_at DESC LIMIT 25", [client.id]);

  const brand = await loadBrand(client.id, client.languages);
  const brandScore = completeness(brand.data);

  return (
    <section className="wrap section-tight stack" style={{ gap: 24 }}>
      <div className="portal-head">
        <div><p className="eyebrow">Admin · <Link href="/admin">Clients</Link></p><h1 className="portal-title">{client.name}</h1></div>
        <div className="btn-row">
          <Link href={`/portal/c/${slug}`} className="btn btn-primary btn-sm">View dashboard</Link>
          <form action={syncNow}><input type="hidden" name="slug" value={slug} /><button className="btn btn-ghost btn-sm" type="submit">Sync now</button></form>
        </div>
      </div>
      {sp.error && <p className="notice" role="alert">Something was missing. Check the form and try again.</p>}

      <div className="card setup-banner">
        <div>
          <h3>Onboarding and Brand Brain</h3>
          <span className="muted">
            {brand.onboarded_at
              ? `Onboarding finished on ${new Date(brand.onboarded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`
              : `Onboarding not finished (at step ${Math.min(brand.onboarding_step, steps.length)} of ${steps.length}).`}{" "}
            Brand Brain: {brandScore.done} of {brandScore.total} sections filled{brand.updated_by ? `, last edited by ${brand.updated_by}` : ""}.
          </span>
        </div>
        <Link href={`/portal/c/${slug}/brand`} className="btn btn-ghost btn-sm">Open Brand Brain</Link>
      </div>

      <div className="grid-2">
        <form action={updateClient} className="card form">
          <h3>Plan</h3>
          <input type="hidden" name="slug" value={slug} />
          <div className="field">
            <label htmlFor="plan">Plan (controls what the dashboard shows)</label>
            <select id="plan" name="plan" defaultValue={client.plan}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="languages">Languages</label><input id="languages" name="languages" defaultValue={client.languages} /></div>
          <div><button className="btn btn-ghost btn-sm" type="submit">Save</button></div>
        </form>

        <div className="card form">
          <h3>Client logins</h3>
          {sp.invite && (
            <div className="notice" role="status">
              Send this one-time link to {sp.email}. It works for 7 days:
              <code className="copy-line">{`${origin}/set-password?token=${sp.invite}`}</code>
            </div>
          )}
          <ul className="plain-list">
            {users.map((u) => <li key={u.email}>{u.email} <span className="muted">{u.password_hash ? "active" : "invited"}</span></li>)}
            {!users.length && <li className="muted">No logins yet.</li>}
          </ul>
          <form action={inviteUser} className="form">
            <input type="hidden" name="slug" value={slug} />
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
              <div className="field"><label htmlFor="uname">Name</label><input id="uname" name="name" /></div>
            </div>
            <div><button className="btn btn-ghost btn-sm" type="submit">Create invite link</button></div>
          </form>
        </div>
      </div>

      <div className="card">
        <h3>Connected accounts</h3>
        <ul className="plain-list">
          {conns.map((c) => <li key={c.platform + c.account_name}>{c.platform}: {c.account_name} <span className={`conn-status ${c.status}`}>{c.status}</span>{c.last_error && <span className="fine"> {c.last_error}</span>}</li>)}
          {!conns.length && <li className="muted">None yet. The client connects from their dashboard, or you can from <Link href={`/portal/c/${slug}/connections`}>their connections page</Link>.</li>}
        </ul>
      </div>

      <div className="card form">
        <h3>Conversion opportunities</h3>
        <p className="fine">Only published items appear on the client&apos;s dashboard (Pro plan).</p>
        <ul className="opps">
          {opps.map((o) => (
            <li key={o.id}>
              <div><b>{o.signal}</b><span>{[o.location, o.published ? "Published" : "Draft"].filter(Boolean).join(" · ")}</span></div>
              <div className="stack" style={{ gap: 8 }}>
                <p>{o.action}</p>
                <form action={setOpportunity} className="btn-row">
                  <input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={o.id} />
                  <button className="btn btn-ghost btn-sm" name="op" value={o.published ? "hide" : "publish"} type="submit">{o.published ? "Unpublish" : "Publish"}</button>
                  <button className="btn btn-ghost btn-sm" name="op" value="delete" type="submit">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <form action={addOpportunity} className="form">
          <input type="hidden" name="slug" value={slug} />
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="field"><label htmlFor="signal">What we noticed</label><input id="signal" name="signal" placeholder="46 comments asking for the price" required /></div>
            <div className="field"><label htmlFor="location">Where</label><input id="location" name="location" placeholder="Morning routine reel · Instagram" /></div>
          </div>
          <div className="field"><label htmlFor="action">What to do</label><input id="action" name="action" placeholder="Pin a reply with the product link" required /></div>
          <label className="check"><input type="checkbox" name="publish" /> Publish to client now</label>
          <div><button className="btn btn-ghost btn-sm" type="submit">Add opportunity</button></div>
        </form>
      </div>

      <div className="card form">
        <h3>Tracked links</h3>
        <p className="fine">Put these in captions, bios and pinned comments. Each unique visitor per day counts as a lead. For website or WhatsApp-bot leads, POST to /api/leads with this client&apos;s key: <code>{client.lead_key}</code></p>
        <div className="table-wrap flat">
          <table>
            <thead><tr><th scope="col">Label</th><th scope="col">Link</th><th scope="col">Goes to</th><th scope="col">Leads</th></tr></thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.code}><td className="topic">{l.label}</td><td><code>{`${origin}/l/${l.code}`}</code></td><td>{l.target_url}</td><td className="num">{l.clicks}</td></tr>
              ))}
              {!links.length && <tr><td colSpan={4}>No links yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <form action={createLink} className="form">
          <input type="hidden" name="slug" value={slug} />
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="field"><label htmlFor="label">Label</label><input id="label" name="label" placeholder="WhatsApp order link" required /></div>
            <div className="field"><label htmlFor="target">Destination URL</label><input id="target" name="target" type="url" placeholder="https://wa.me/91..." required /></div>
          </div>
          <div className="field">
            <label htmlFor="video">Credit leads to video (optional)</label>
            <select id="video" name="video" defaultValue=""><option value="">No specific video</option>{videos.map((v) => <option key={v.id} value={v.id}>{v.title.slice(0, 70)}</option>)}</select>
          </div>
          <div><button className="btn btn-ghost btn-sm" type="submit">Create link</button></div>
        </form>
      </div>

      <div className="card">
        <h3>Recent videos</h3>
        <p className="fine">Set a topic and language so the dashboard can group results. Synced data keeps your edits.</p>
        <div className="table-wrap flat">
          <table>
            <thead><tr><th scope="col">Video</th><th scope="col">Topic and language</th></tr></thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id}>
                  <td><b>{v.title}</b><br /><span className="fine">{v.platform} · {v.published_at.slice(0, 10)}</span></td>
                  <td>
                    <form action={tagVideo} className="tag-form">
                      <input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={v.id} />
                      <input name="topic" defaultValue={v.topic ?? ""} placeholder="Topic" aria-label="Topic" />
                      <input name="language" defaultValue={v.language ?? ""} placeholder="Language" aria-label="Language" />
                      <button className="btn btn-ghost btn-sm" type="submit">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!videos.length && <tr><td colSpan={2}>No videos synced yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
