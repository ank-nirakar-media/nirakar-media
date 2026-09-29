import { LogoMark } from "./Logo";

// Decorative product shot for the home hero: a mini version of the client workspace.
const menu = ["Overview", "Content", "Calendar", "Analytics", "Approvals", "Assets"];
const kpis = [
  { label: "Total views", value: "2.4M", delta: "62%" },
  { label: "Engagement", value: "8.3%", delta: "28%" },
  { label: "Subscribers", value: "+12.6K", delta: "46%" },
  { label: "Leads", value: "1,284", delta: "72%" },
];
const calendar = [
  { day: "Mon 12", title: "How to price your first product", status: "Published", tone: "ok" },
  { day: "Wed 14", title: "5 AI tools for small shops", status: "In review", tone: "review" },
  { day: "Fri 16", title: "Behind the scenes (Tamil dub)", status: "Scheduled", tone: "sched" },
  { day: "Sun 18", title: "Festive season checklist", status: "Draft", tone: "draft" },
];
const points = [4, 7, 9, 12, 14, 19, 22, 27, 31, 36, 44, 52];

export function HeroDashboard() {
  const w = 260, h = 110, max = 56;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - (p / max) * h] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <div className="hd" aria-hidden="true">
      <div className="hd-bar"><i /><i /><i /></div>
      <div className="hd-top">
        <span className="hd-brand"><LogoMark size={18} /> NIRAKAR <small>MEDIA</small></span>
        <span className="hd-range">Last 30 days</span>
      </div>
      <div className="hd-body">
        <ul className="hd-menu">
          {menu.map((m, i) => <li key={m} className={i === 0 ? "on" : ""}>{m}</li>)}
        </ul>
        <div className="hd-main">
          <div className="hd-kpis">
            {kpis.map((k) => (
              <div key={k.label} className="hd-kpi">
                <span>{k.label}</span>
                <b>{k.value}</b>
                <em>▲ {k.delta}</em>
              </div>
            ))}
          </div>
          <div className="hd-row">
            <div className="hd-card">
              <p>Growth over time</p>
              <svg viewBox={`0 0 ${w} ${h + 4}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="hdfill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#8b5cf6" stopOpacity=".45" />
                    <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#hdfill)" />
                <path d={line} fill="none" stroke="#a78bfa" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <div className="hd-card">
              <p>Content calendar</p>
              <ul className="hd-cal">
                {calendar.map((c) => (
                  <li key={c.day}><span>{c.day}</span><b>{c.title}</b><em className={c.tone}>{c.status}</em></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
