import type { Metadata } from "next";
import Link from "next/link";
import { ExportPanel } from "@/components/portal/ExportPanel";
import { requireAdmin } from "@/lib/auth";
import { footageConfigured } from "@/lib/video/footage";
import { EXPORT_SOURCES, listExports, renderConfigured } from "@/lib/video/exports";
import { voiceConfigured } from "@/lib/video/voice";

export const metadata: Metadata = { title: "Video exports", robots: { index: false } };

export default async function AdminExports() {
  await requireAdmin();
  const rows = await listExports();
  return (
    <section className="wrap section-tight stack" style={{ gap: 22, maxWidth: 900 }}>
      <div>
        <p className="eyebrow">Admin · <Link href="/sample-video">Sample videos</Link> · <Link href="/admin/voices">Voices</Link></p>
        <h1 className="portal-title">Download the demos as MP4</h1>
        <p className="muted">
          Makes a real video file of a website demo, with the voice you picked in Voices and the same stock footage, for LinkedIn,
          WhatsApp or ads. Each file takes a few minutes. Files are kept in your private Vercel Blob store; each Download click makes a link that works for one hour.
        </p>
      </div>
      {!renderConfigured() && (
        <p className="notice" role="alert">
          No Blob store is connected yet. In Vercel, open the project, then Storage, create a Blob store and connect it to this project.
          Then redeploy.
        </p>
      )}
      {!voiceConfigured() && <p className="notice notice-inline" role="alert">SARVAM_API_KEY isn&apos;t set, so videos will be silent.</p>}
      {!footageConfigured() && <p className="notice notice-inline" role="alert">No footage key is set, so backgrounds will be colour only.</p>}
      <ExportPanel sources={EXPORT_SOURCES} initial={rows} disabled={!renderConfigured()} />
    </section>
  );
}
