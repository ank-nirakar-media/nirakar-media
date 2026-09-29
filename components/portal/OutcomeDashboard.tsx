import Link from "next/link";
import { BarList, LineChart } from "@/components/Charts";
import type { Client } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { planFeatures, ranges, type Dashboard, type Metrics } from "@/lib/portal";

const nf = new Intl.NumberFormat("en-IN");
function compact(n: number) {
  if (Math.abs(n) >= 100000) return `${+(n / 100000).toFixed(2)}L`;
  if (Math.abs(n) >= 1000) return `${+(n / 1000).toFixed(1)}K`;
  return nf.format(n);
}
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function delta(cur: number, prev: number) {
  if (!prev) return cur ? { text: "New", up: true } : null;
  const d = (cur - prev) / Math.abs(prev);
  return { text: `${d >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(d * 100))}%`, up: d >= 0 };
}

type Tile = { key: string; label: string; value: string; cur: number; prev: number; note: string; locked?: string };

export function OutcomeDashboard({ client, data, basePath }: { client: Client; data: Dashboard; basePath: string }) {
  const f = planFeatures[client.plan];
  const c: Metrics = data.current;
  const p: Metrics = data.previous;
  const planName = getPlan(client.plan)?.name ?? client.plan;
  const tiles: Tile[] = [
    { key: "published", label: "Content published", value: nf.format(c.published), cur: c.published, prev: p.published, note: "Videos and repurposed posts" },
    { key: "views", label: "Views", value: compact(c.views), cur: c.views, prev: p.views, note: "All connected platforms" },
    { key: "engagement", label: "Engagement rate", value: pct(c.engagementRate), cur: c.engagementRate, prev: p.engagementRate, note: `${compact(c.engagements)} likes, comments, shares, saves` },
    { key: "subs", label: "Subscriber growth", value: `${c.followers >= 0 ? "+" : ""}${nf.format(c.followers)}`, cur: c.followers, prev: p.followers, note: "Followers and subscribers gained" },
    { key: "search", label: "Search views", value: compact(c.searchViews), cur: c.searchViews, prev: p.searchViews, note: "Views that came from YouTube search", locked: f.search ? undefined : "Growth" },
    { key: "leads", label: "Leads generated", value: nf.format(c.leads), cur: c.leads, prev: p.leads, note: "Tracked link clicks and form leads", locked: f.leads ? undefined : "Growth" },
  ];

  return (
    <div className="dash">
      <div className="dash-top">
        <div className="dash-client">
          <span className="dash-avatar" aria-hidden="true">{client.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <b>{client.name}</b>
            <span>{planName} plan · {client.languages}</span>
          </div>
        </div>
        <div className="dash-tabs" role="group" aria-label="Time range">
          {ranges.map((r) => (
            <Link key={r} href={`${basePath}?range=${r}`} className={r === data.range ? "is-active" : undefined} aria-current={r === data.range ? "page" : undefined}>
              {r} days
            </Link>
          ))}
        </div>
      </div>
      <p className="dash-demo-note">
        {data.start} to {data.end}, compared with the previous {data.range} days.{" "}
        {data.trackingSince && data.trackingSince > data.start && `Tracking began on ${data.trackingSince}, so growth figures cover the days since then. `}
        {data.lastSynced ? `Last updated ${new Date(data.lastSynced).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.` : "Waiting for the first sync."}
      </p>

      {!data.hasData && (
        <div className="notice">
          No videos yet. <Link href={`${basePath}/connections`}>Connect your YouTube or Instagram account</Link> and your numbers appear after the first sync.
        </div>
      )}

      <div className="kpis">
        {tiles.map((t) => {
          const d = t.locked ? null : delta(t.cur, t.prev);
          return (
            <div key={t.key} className={`kpi${t.locked ? " kpi-locked" : ""}`}>
              <span className="kpi-label">{t.label}</span>
              {t.locked ? (
                <>
                  <strong>—</strong>
                  <span className="kpi-note">Included from the {t.locked} plan</span>
                </>
              ) : (
                <>
                  <strong>{t.value}</strong>
                  {d && <span className={`kpi-delta${d.up ? "" : " down"}`}>{d.text} <small>vs previous {data.range} days</small></span>}
                  <span className="kpi-note">{t.note}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="dash-grid">
        <div className="dash-card dash-wide">
          <div className="dash-card-head"><h3>Views</h3><span>{data.range === 90 ? "Weekly" : "Daily"}, all platforms</span></div>
          {data.series.some((s) => s.value > 0) ? <LineChart data={data.series} id={`r${data.range}`} /> : <p className="muted">No views recorded in this period yet.</p>}
        </div>
        <div className="dash-card">
          <div className="dash-card-head"><h3>Views by language</h3><span>Original and regional dubs</span></div>
          {data.byLanguage.length ? <BarList data={data.byLanguage} unit="views" /> : <p className="muted">Languages appear once videos are tagged.</p>}
        </div>
        <div className="dash-card">
          <div className="dash-card-head"><h3>Views by platform</h3><span>Last {data.range} days</span></div>
          {data.byPlatform.length ? <BarList data={data.byPlatform} unit="views" /> : <p className="muted">No platform data yet.</p>}
        </div>

        <div className="dash-card dash-wide">
          <div className="dash-card-head"><h3>Best-performing topics</h3><span>Ranked by leads, then views</span></div>
          {!f.topics ? (
            <p className="muted">Topic rankings are included from the Growth plan.</p>
          ) : data.topics.length ? (
            <div className="table-wrap flat">
              <table>
                <thead>
                  <tr><th scope="col">Topic</th><th scope="col">Format</th><th scope="col">Views</th><th scope="col">Engagement</th><th scope="col">Leads</th></tr>
                </thead>
                <tbody>
                  {data.topics.map((t) => (
                    <tr key={t.topic}>
                      <td className="topic">{t.topic}</td><td>{t.format}</td><td className="num">{compact(t.views)}</td><td className="num">{pct(t.engagementRate)}</td><td className="num">{t.leads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No topics with views in this period yet.</p>
          )}
        </div>

        <div className="dash-card dash-wide">
          <div className="dash-card-head"><h3>Conversion opportunities</h3><span>Spotted in your data, checked by your growth manager</span></div>
          {!f.opportunities ? (
            <p className="muted">Conversion opportunities are included in the Pro plan.</p>
          ) : data.opportunities.length ? (
            <ul className="opps">
              {data.opportunities.map((o) => (
                <li key={o.signal}>
                  <div><b>{o.signal}</b><span>{o.location}</span></div>
                  <p>{o.action}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Your growth manager will add opportunities here as they spot them.</p>
          )}
        </div>
      </div>
    </div>
  );
}
