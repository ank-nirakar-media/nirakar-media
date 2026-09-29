import type { Metadata } from "next";
import Link from "next/link";
import { OutcomeDashboard } from "@/components/portal/OutcomeDashboard";
import { requireClientAccess } from "@/lib/auth";
import { loadDashboard, parseRange } from "@/lib/portal";

export const metadata: Metadata = { title: "Outcome dashboard", robots: { index: false } };

export default async function ClientDashboard({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ range?: string }> }) {
  const { slug } = await params;
  const { range } = await searchParams;
  const { user, client } = await requireClientAccess(slug);
  const data = await loadDashboard(client, parseRange(range));
  return (
    <section className="wrap section-tight stack" style={{ gap: 20 }}>
      <div className="portal-head">
        <div>
          <p className="eyebrow">Outcome dashboard</p>
          <h1 className="portal-title">{client.name}</h1>
        </div>
        <div className="btn-row">
          <Link href={`/portal/c/${slug}/connections`} className="btn btn-ghost btn-sm">Connected accounts</Link>
          {user.role === "admin" && <Link href={`/admin/c/${slug}`} className="btn btn-ghost btn-sm">Manage client</Link>}
        </div>
      </div>
      <OutcomeDashboard client={client} data={data} basePath={`/portal/c/${slug}`} />
      <p className="fine">Tip: use your browser&apos;s Print and choose Save as PDF for a monthly report.</p>
    </section>
  );
}
