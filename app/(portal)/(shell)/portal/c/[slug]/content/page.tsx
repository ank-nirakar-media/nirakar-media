import type { Metadata } from "next";
import Link from "next/link";
import { ContentCalendar, ItemFlags } from "@/components/portal/Pipeline";
import { requireClientAccess } from "@/lib/auth";
import { calendarDate, formatDate, formatLabel, listItems, monthlyQuota, parseMonth, stageOf, stages, todayIst } from "@/lib/pipeline";
import { getPlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Content", robots: { index: false } };

export default async function ClientContent({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ month?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { client } = await requireClientAccess(slug);
  const items = await listItems(client.id);
  const month = parseMonth(sp.month);
  const plan = getPlan(client.plan)!;
  const quota = monthlyQuota(plan.volume);
  const thisMonth = todayIst().slice(0, 7);
  const planned = items.filter((i) => calendarDate(i)?.startsWith(thisMonth)).length;
  const waiting = items.filter((i) => i.review);
  const inWork = items.filter((i) => !i.review && i.stage !== "published");
  const published = items.filter((i) => i.stage === "published").reverse();
  const href = (id: number) => `/portal/c/${slug}/content/${id}`;

  return (
    <section className="wrap section-tight stack" style={{ gap: 22 }}>
      <div className="portal-head">
        <div>
          <p className="eyebrow">Content · <Link href={`/portal/c/${slug}`}>{client.name}</Link></p>
          <h1 className="portal-title">Your content plan</h1>
          <p className="muted">{planned} of {quota} videos planned for {new Date().toLocaleDateString("en-IN", { month: "long", timeZone: "Asia/Kolkata" })} on your {plan.name} plan.</p>
        </div>
      </div>

      <div className="card stack" style={{ gap: 12 }}>
        <h3>Needs your approval</h3>
        {waiting.length ? waiting.map((i) => (
          <Link key={i.id} href={href(i.id)} className="approval-row">
            <span><b>{i.title}</b><ItemFlags item={i} forClient /></span>
            <span className="btn btn-primary btn-sm">Review</span>
          </Link>
        )) : <p className="muted">Nothing waiting on you right now.</p>}
        <p className="fine">We send you each script and each final video to approve. If you don&apos;t reply within 48 hours we treat it as approved, so nothing stalls.</p>
      </div>

      <ContentCalendar items={items} month={month} basePath={`/portal/c/${slug}/content`} hrefFor={(i) => href(i.id)} />

      <div className="grid-2">
        <div className="card stack" style={{ gap: 10 }}>
          <h3>In the works</h3>
          {stages.filter((s) => s.id !== "published").map((s) => {
            const list = inWork.filter((i) => i.stage === s.id);
            return list.length ? (
              <div key={s.id} className="stack" style={{ gap: 6 }}>
                <span className="brand-q">{s.client}</span>
                {list.map((i) => (
                  <Link key={i.id} href={href(i.id)} className="work-row">
                    <span>{i.title}</span>
                    <span className="fine">{[formatLabel(i.format), i.publish_on && formatDate(i.publish_on)].filter(Boolean).join(" · ")}</span>
                  </Link>
                ))}
              </div>
            ) : null;
          })}
          {!inWork.length && <p className="muted">Your growth manager is preparing your next ideas.</p>}
        </div>
        <div className="card stack" style={{ gap: 10 }}>
          <h3>Published</h3>
          {published.map((i) => (
            <div key={i.id} className="work-row">
              <Link href={href(i.id)}>{i.title}</Link>
              {i.published_url ? <a href={i.published_url} target="_blank" rel="noreferrer noopener" className="fine">Watch</a> : <span className="fine">{stageOf(i.stage).client}</span>}
            </div>
          ))}
          {!published.length && <p className="muted">Nothing published yet.</p>}
        </div>
      </div>
    </section>
  );
}
