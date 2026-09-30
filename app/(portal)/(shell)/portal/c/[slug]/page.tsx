import type { Metadata } from "next";
import Link from "next/link";
import { OutcomeDashboard } from "@/components/portal/OutcomeDashboard";
import { requireClientAccess } from "@/lib/auth";
import { loadBrand, steps } from "@/lib/brand";
import { loadDashboard, parseRange } from "@/lib/portal";

export const metadata: Metadata = { title: "Outcome dashboard", robots: { index: false } };

export default async function ClientDashboard({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ range?: string; welcome?: string }> }) {
  const { slug } = await params;
  const { range, welcome } = await searchParams;
  const { user, client } = await requireClientAccess(slug);
  const data = await loadDashboard(client, parseRange(range));
  const brand = await loadBrand(client.id, client.languages);
  const setupStep = Math.min(brand.onboarding_step, steps.length);
  return (
    <section className="wrap section-tight stack" style={{ gap: 20 }}>
      <div className="portal-head">
        <div>
          <p className="eyebrow">Outcome dashboard</p>
          <h1 className="portal-title">{client.name}</h1>
        </div>
        <div className="btn-row">
          <Link href={`/portal/c/${slug}/brand`} className="btn btn-ghost btn-sm">Brand Brain</Link>
          <Link href={`/portal/c/${slug}/connections`} className="btn btn-ghost btn-sm">Connected accounts</Link>
          {user.role === "admin" && <Link href={`/admin/c/${slug}`} className="btn btn-ghost btn-sm">Manage client</Link>}
        </div>
      </div>
      {welcome && brand.onboarded_at && (
        <p className="notice notice-inline" role="status">
          You&apos;re all set. Your growth manager will review your answers and share your first content plan. You can update them any time in <Link href={`/portal/c/${slug}/brand`}>Brand Brain</Link>.
        </p>
      )}
      {!brand.onboarded_at && (
        <div className="notice setup-banner">
          <div>
            <b>Finish setting up (step {setupStep} of {steps.length})</b>
            <span className="muted">A few answers about your brand help us plan content that sounds like you.</span>
          </div>
          <Link href={`/portal/c/${slug}/onboarding?step=${setupStep}`} className="btn btn-primary btn-sm">Continue setup</Link>
        </div>
      )}
      <OutcomeDashboard client={client} data={data} basePath={`/portal/c/${slug}`} />
      <p className="fine">Tip: use your browser&apos;s Print and choose Save as PDF for a monthly report.</p>
    </section>
  );
}
