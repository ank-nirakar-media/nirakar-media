import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { plans } from "@/lib/plans";
import { createClient } from "../../actions";

export const metadata: Metadata = { title: "Clients", robots: { index: false } };

type Row = { slug: string; name: string; plan: string; connections: number; errors: number; last_synced: string | null; users: number };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  const clients = await query<Row>(`
    SELECT c.slug, c.name, c.plan,
      (SELECT count(*)::int FROM connections x WHERE x.client_id = c.id AND x.status <> 'disconnected') AS connections,
      (SELECT count(*)::int FROM connections x WHERE x.client_id = c.id AND x.status = 'error') AS errors,
      (SELECT max(last_synced_at)::text FROM connections x WHERE x.client_id = c.id) AS last_synced,
      (SELECT count(*)::int FROM users u WHERE u.client_id = c.id) AS users
    FROM clients c ORDER BY c.name`);
  return (
    <section className="wrap section-tight stack" style={{ gap: 24 }}>
      <div><p className="eyebrow">Admin</p><h1 className="portal-title">Clients</h1></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Client</th><th scope="col">Plan</th><th scope="col">Accounts</th><th scope="col">Logins</th><th scope="col">Last sync</th></tr></thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.slug}>
                <td className="topic"><Link href={`/admin/c/${c.slug}`}>{c.name}</Link></td>
                <td>{c.plan}</td>
                <td>{c.connections}{c.errors ? <span className="conn-status error"> {c.errors} need attention</span> : null}</td>
                <td>{c.users}</td>
                <td>{c.last_synced ? new Date(c.last_synced).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Never"}</td>
              </tr>
            ))}
            {!clients.length && <tr><td colSpan={5}>No clients yet. Add the first one below.</td></tr>}
          </tbody>
        </table>
      </div>

      <form action={createClient} className="card form" style={{ maxWidth: 640 }}>
        <h3>Add a client</h3>
        {error && <p className="notice" role="alert">{error === "slug" ? "That web address is already used by another client." : "Fill in a name and choose a plan."}</p>}
        <div className="grid-2" style={{ gap: 16 }}>
          <div className="field"><label htmlFor="name">Business name</label><input id="name" name="name" required /></div>
          <div className="field"><label htmlFor="slug">Short name for the web address</label><input id="slug" name="slug" placeholder="glow-studio" /></div>
          <div className="field">
            <label htmlFor="plan">Plan</label>
            <select id="plan" name="plan" defaultValue="growth">{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="languages">Languages</label><input id="languages" name="languages" placeholder="English, Hindi" /></div>
        </div>
        <div><button className="btn btn-primary" type="submit">Add client</button></div>
      </form>
    </section>
  );
}
