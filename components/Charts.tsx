// Server-rendered charts for the dashboard demo. Hover works with CSS only.

const nf = new Intl.NumberFormat("en-IN");

function niceMax(v: number) {
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= v) ?? 10;
  return step * pow * 4;
}

function short(n: number) {
  if (n >= 100000) return `${+(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function LineChart({ data, id }: { data: { label: string; value: number }[]; id: string }) {
  const W = 720, H = 240, L = 52, R = 16, T = 16, B = 30;
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, data.length - 1);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)} ${H - B} L${x(0)} ${H - B} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelIdx = Array.from(new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]));
  const band = (W - L - R) / Math.max(1, data.length - 1);
  const last = data[data.length - 1];
  return (
    <svg className="chart-line" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Views over time, latest ${nf.format(last.value)}`}>
      <defs>
        <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8B5CF6" stopOpacity=".35" />
          <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" className="axis">{short(t)}</text>
        </g>
      ))}
      {labelIdx.map((i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="axis">
          {data[i].label}
        </text>
      ))}
      <path d={area} fill={`url(#area-${id})`} />
      <path d={line} fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(data.length - 1)} cy={y(last.value)} r="5" fill="#D08BFF" stroke="#07081a" strokeWidth="2" />
      {data.map((d, i) => {
        const tx = Math.min(Math.max(x(i) - 60, L), W - R - 120);
        return (
          <g key={i} className="pt" tabIndex={0}>
            <rect x={x(i) - band / 2} y={T} width={band} height={H - T - B} fill="transparent" />
            <line x1={x(i)} x2={x(i)} y1={T} y2={H - B} className="hover-line" />
            <circle cx={x(i)} cy={y(d.value)} r="4.5" className="hover-dot" />
            <g className="tip">
              <rect x={tx} y={T} width="120" height="42" rx="8" />
              <text x={tx + 10} y={T + 17} className="tip-label">{d.label}</text>
              <text x={tx + 10} y={T + 34} className="tip-value">{nf.format(d.value)} views</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

export function BarList({ data, unit }: { data: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(...data.map((d) => d.value));
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <ul className="bar-list">
      {data.map((d) => (
        <li key={d.label} title={`${d.label}: ${nf.format(d.value)} ${unit}`}>
          <span className="bar-label">{d.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="bar-value">{short(d.value)} <small>{Math.round((d.value / total) * 100)}%</small></span>
        </li>
      ))}
    </ul>
  );
}
