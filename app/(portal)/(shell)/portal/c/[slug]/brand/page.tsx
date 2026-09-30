import type { Metadata } from "next";
import Link from "next/link";
import { BrandField } from "@/components/portal/BrandField";
import { requireClientAccess } from "@/lib/auth";
import { completeness, fields, loadBrand, sections } from "@/lib/brand";
import { saveBrandSection } from "../../../../../brand-actions";

export const metadata: Metadata = { title: "Brand Brain", robots: { index: false } };

export default async function BrandBrain({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const { client } = await requireClientAccess(slug);
  const brand = await loadBrand(client.id, client.languages);
  const score = completeness(brand.data);

  return (
    <section className="wrap section-tight stack" style={{ gap: 22, maxWidth: 880 }}>
      <div className="portal-head">
        <div>
          <p className="eyebrow">Brand Brain · <Link href={`/portal/c/${slug}`}>{client.name}</Link></p>
          <h1 className="portal-title">Everything we know about your brand</h1>
          <p className="muted">Your team plans every script, video and caption from these answers. Keep them current and your content stays on-brand.</p>
        </div>
      </div>

      <div className="card brand-meter">
        <div className="brand-meter-head">
          <b>{score.done} of {score.total} sections filled</b>
          {brand.updated_at && <span className="fine">Last updated {new Date(brand.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
        </div>
        <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={score.total} aria-valuenow={score.done}>
          <span style={{ width: `${Math.round((score.done / score.total) * 100)}%` }} />
        </div>
        {score.missing.length > 0 && (
          <p className="fine">Still to add: {score.missing.map((m, i) => (
            <span key={m}>{i > 0 && ", "}<a href={`#${sections.find((s) => s.title === m)!.id}`}>{m}</a></span>
          ))}</p>
        )}
      </div>

      {sections.map((s) => (
        <form key={s.id} id={s.id} action={saveBrandSection} className="card form brand-section">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="section" value={s.id} />
          <h3>{s.title}</h3>
          {saved === s.id && <p className="notice notice-inline" role="status">Saved.</p>}
          {s.fields.map((k) => <BrandField key={k} field={fields[k]} data={brand.data} />)}
          <div><button className="btn btn-ghost btn-sm" type="submit">Save {s.title.toLowerCase()}</button></div>
        </form>
      ))}
    </section>
  );
}
