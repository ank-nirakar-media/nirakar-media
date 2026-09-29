import type { Metadata } from "next";
import Link from "next/link";
import { BarList, LineChart } from "@/components/Charts";
import { opportunities, periods, topics } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Outcome dashboard demo",
  description: "See what Nirakar Media clients see: views, engagement, leads, search views, subscriber growth, best topics and conversion opportunities.",
};

export default function DashboardPage() {
  return (
    <>
      <section className="wrap page-hero">
        <p className="eyebrow">Outcome dashboard · preview</p>
        <h1>See what your content <span className="grad-text">earns, not just what we delivered</span></h1>
        <p className="lead">
          This is the dashboard every client gets, filled with example data for a Pro plan. Clients log in to see their
          own numbers, updated daily from their connected accounts. Try it: switch the time range and hover the chart.
        </p>
      </section>

      <section className="section-tight">
        <div className="wrap">
          <div className="dash">
            <input type="radio" name="period" id="period-7d" className="tab-input" />
            <input type="radio" name="period" id="period-30d" className="tab-input" defaultChecked />
            <input type="radio" name="period" id="period-90d" className="tab-input" />

            <div className="dash-top">
              <div className="dash-client">
                <span className="dash-avatar" aria-hidden="true">GS</span>
                <div>
                  <b>Glow Studio (sample client)</b>
                  <span>D2C skincare · Growth plan · Hindi, English, Tamil, Telugu, Kannada</span>
                </div>
              </div>
              <div className="dash-tabs" role="group" aria-label="Time range">
                {periods.map((p) => (
                  <label key={p.id} htmlFor={`period-${p.id}`} className={`tab-${p.id}`}>{p.label.replace("Last ", "")}</label>
                ))}
              </div>
            </div>
            <p className="dash-demo-note">Example data for a fictional brand. Your report uses your own accounts&apos; data.</p>

            {periods.map((p) => (
              <div key={p.id} className={`dash-panel panel-${p.id}`}>
                <div className="kpis">
                  {p.kpis.map((k) => (
                    <div key={k.key} className="kpi">
                      <span className="kpi-label">{k.label}</span>
                      <strong>{k.value}</strong>
                      <span className="kpi-delta">▲ {k.delta}% <small>{p.compare}</small></span>
                      {k.note && <span className="kpi-note">{k.note}</span>}
                    </div>
                  ))}
                </div>

                <div className="dash-grid">
                  <div className="dash-card dash-wide">
                    <div className="dash-card-head"><h3>Views</h3><span>{p.label}, all platforms</span></div>
                    <LineChart data={p.views} id={p.id} />
                  </div>
                  <div className="dash-card">
                    <div className="dash-card-head"><h3>Views by language</h3><span>Regional dubs at work</span></div>
                    <BarList data={p.byLanguage} unit="views" />
                  </div>
                  <div className="dash-card">
                    <div className="dash-card-head"><h3>Views by platform</h3><span>{p.label}</span></div>
                    <BarList data={p.byPlatform} unit="views" />
                  </div>
                </div>
              </div>
            ))}

            <div className="dash-grid">
              <div className="dash-card dash-wide">
                <div className="dash-card-head"><h3>Best-performing topics</h3><span>Ranked by leads</span></div>
                <div className="table-wrap flat">
                  <table>
                    <thead>
                      <tr><th scope="col">Topic</th><th scope="col">Format</th><th scope="col">Views</th><th scope="col">Engagement</th><th scope="col">Leads</th></tr>
                    </thead>
                    <tbody>
                      {topics.map((t) => (
                        <tr key={t.topic}>
                          <td className="topic">{t.topic}</td><td>{t.format}</td><td className="num">{t.views}</td><td className="num">{t.engagement}</td><td className="num">{t.leads}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="dash-card dash-wide">
                <div className="dash-card-head"><h3>Conversion opportunities</h3><span>Spotted by AI, checked by your growth manager</span></div>
                <ul className="opps">
                  {opportunities.map((o) => (
                    <li key={o.signal}>
                      <div><b>{o.signal}</b><span>{o.where}</span></div>
                      <p>{o.action}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: 28 }}>
            <Link href="/pricing" className="btn btn-primary">Start your engine</Link>
            <Link href="/pricing#stages" className="btn btn-ghost">What each plan reports</Link>
          </div>
        </div>
      </section>
    </>
  );
}
