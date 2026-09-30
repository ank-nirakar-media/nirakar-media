import type { Metadata } from "next";
import Link from "next/link";
import { ContentCalendar, ItemFlags } from "@/components/portal/Pipeline";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDate, formatLabel, formats, listItems, parseMonth, platforms, stages } from "@/lib/pipeline";
import { createItem } from "../../../pipeline-actions";

export const metadata: Metadata = { title: "Content pipeline", robots: { index: false } };

export default async function AdminContent({ searchParams }: { searchParams: Promise<{ client?: string; month?: string; view?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const clients = await query<{ id: number; slug: string; name: string }>("SELECT id, slug, name FROM clients ORDER BY name");
  const current = clients.find((c) => c.slug === sp.client);
  const items = await listItems(current?.id);
  const month = parseMonth(sp.month);
  const view = sp.view === "calendar" ? "calendar" : "board";
  const withView = (v: string) => `/admin/content?${new URLSearchParams({ ...(current ? { client: current.slug } : {}), view: v })}`;
  const waiting = items.filter((i) => i.review).length;

  return (
    <section className="wrap section-tight stack" style={{ gap: 22 }}>
      <div className="portal-head">
        <div>
          <p className="eyebrow">Admin · <Link href="/admin">Clients</Link></p>
          <h1 className="portal-title">Content pipeline</h1>
          <p className="muted">{items.length} items{waiting ? ` · ${waiting} waiting on clients` : ""}</p>
        </div>
        <form className="btn-row" action="/admin/content">
          <label className="sr-only" htmlFor="client-filter">Client</label>
          <select id="client-filter" name="client" defaultValue={current?.slug ?? ""} className="select-sm">
            <option value="">All clients</option>
            {clients.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <input type="hidden" name="view" value={view} />
          <button className="btn btn-ghost btn-sm" type="submit">Show</button>
        </form>
      </div>

      <nav className="dash-tabs" aria-label="View">
        <Link href={withView("board")} className={view === "board" ? "is-active" : ""}>Board</Link>
        <Link href={withView("calendar")} className={view === "calendar" ? "is-active" : ""}>Calendar</Link>
      </nav>

      <details className="card add-item" open={items.length === 0 || Boolean(sp.error)}>
        <summary><b>Add a content item</b></summary>
        <form action={createItem} className="form" style={{ marginTop: 14 }}>
          {sp.error && <p className="notice notice-inline" role="alert">Choose a client and give the item a title.</p>}
          <div className="grid-2" style={{ gap: 14 }}>
            <div className="field">
              <label htmlFor="new-client">Client</label>
              <select id="new-client" name="client" defaultValue={current?.slug ?? ""} required>
                <option value="">Choose a client</option>
                {clients.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="new-title">Title or idea</label><input id="new-title" name="title" required placeholder="3 hair oil myths your grandmother believed" /></div>
            <div className="field">
              <label htmlFor="new-format">Format</label>
              <select id="new-format" name="format">{formats.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
            </div>
            <div className="field">
              <label htmlFor="new-platform">Platform</label>
              <select id="new-platform" name="platform"><option value="">Not decided</option>{platforms.map((p) => <option key={p}>{p}</option>)}</select>
            </div>
            <div className="field"><label htmlFor="new-language">Language</label><input id="new-language" name="language" placeholder="Client's first language" /></div>
            <div className="field"><label htmlFor="new-publish">Publish on</label><input id="new-publish" name="publish_on" type="date" /></div>
          </div>
          <div className="field"><label htmlFor="new-brief">Brief</label><textarea id="new-brief" name="brief" rows={3} placeholder="Angle, hook, key points, call to action" /></div>
          <div><button className="btn btn-primary btn-sm" type="submit">Add item</button></div>
        </form>
      </details>

      {view === "calendar" ? (
        <ContentCalendar items={items} month={month} basePath={withView("calendar")} hrefFor={(i) => `/admin/content/${i.id}`} />
      ) : (
        <div className="board">
          {stages.map((s) => {
            const list = items.filter((i) => i.stage === s.id);
            return (
              <section key={s.id} className="board-col" aria-labelledby={`col-${s.id}`}>
                <h2 id={`col-${s.id}`} className="board-col-head">{s.label} <span>{list.length}</span></h2>
                {list.map((i) => (
                  <Link key={i.id} href={`/admin/content/${i.id}`} className="board-card">
                    <b>{i.title}</b>
                    {!current && <span className="muted">{i.client_name}</span>}
                    <span className="fine">{[formatLabel(i.format), i.language, i.publish_on && `Publish ${formatDate(i.publish_on)}`].filter(Boolean).join(" · ")}</span>
                    <ItemFlags item={i} />
                  </Link>
                ))}
                {!list.length && <p className="fine board-empty">Nothing here</p>}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
