import Link from "next/link";
import { calendarDate, formatDate, hoursLeft, monthLabel, reviewLabel, shiftMonth, todayIst, type Item } from "@/lib/pipeline";

// Small status line for an item: what it waits on, or what changed.
export function ItemFlags({ item, forClient = false }: { item: Item; forClient?: boolean }) {
  const left = hoursLeft(item);
  return (
    <>
      {item.review && (
        <span className="flag flag-wait">
          {forClient ? `${reviewLabel(item.review)} needs your approval` : `Waiting on client: ${item.review}`}
          {left !== null && ` · auto-approves in ${left}h`}
        </span>
      )}
      {!item.review && item.changes_requested && <span className="flag flag-changes">Changes requested</span>}
    </>
  );
}

// Month grid. Each item sits on its publish date, or its due date if it has none.
export function ContentCalendar({ items, month, basePath, hrefFor }: { items: Item[]; month: string; basePath: string; hrefFor: (i: Item) => string }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // weeks start on Monday
  const today = todayIst();
  const byDay = new Map<string, Item[]>();
  for (const i of items) {
    const d = calendarDate(i);
    if (d?.startsWith(month)) byDay.set(d, [...(byDay.get(d) ?? []), i]);
  }
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, k) => `${month}-${String(k + 1).padStart(2, "0")}`)];
  const inMonth = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  const sep = basePath.includes("?") ? "&" : "?";

  return (
    <div className="card cal">
      <div className="cal-head">
        <Link href={`${basePath}${sep}month=${shiftMonth(month, -1)}`} className="btn btn-ghost btn-sm" aria-label="Previous month">←</Link>
        <h3>{monthLabel(month)}</h3>
        <Link href={`${basePath}${sep}month=${shiftMonth(month, 1)}`} className="btn btn-ghost btn-sm" aria-label="Next month">→</Link>
      </div>
      <div className="cal-grid" role="grid" aria-label={monthLabel(month)}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="cal-dow" role="columnheader">{d}</div>)}
        {cells.map((d, k) => (
          <div key={d ?? `x${k}`} className={`cal-cell${d === today ? " is-today" : ""}${d ? "" : " is-empty"}`} role="gridcell">
            {d && <span className="cal-day">{Number(d.slice(8))}</span>}
            {d && byDay.get(d)?.map((i) => (
              <Link key={i.id} href={hrefFor(i)} className={`cal-item stage-${i.stage}`} title={i.title}>{i.title}</Link>
            ))}
          </div>
        ))}
      </div>
      <ul className="cal-agenda plain-list">
        {inMonth.map(([d, list]) => list.map((i) => (
          <li key={i.id}><span className="cal-agenda-date">{formatDate(d)}</span><Link href={hrefFor(i)}>{i.title}</Link></li>
        )))}
        {!inMonth.length && <li className="muted">Nothing dated this month yet.</li>}
      </ul>
    </div>
  );
}
