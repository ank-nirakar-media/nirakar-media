import type { Metadata } from "next";
import Link from "next/link";
import { VoiceAudition } from "@/components/portal/VoiceAudition";
import { requireAdmin } from "@/lib/auth";
import { V3_SPEAKERS, VOICE_MODEL, voiceConfigured } from "@/lib/video/voice";
import { loadVoiceSettings } from "@/lib/video/voice-settings";
import { voiceSources } from "@/lib/video/voices";
import { resetVoice, saveVoice } from "../../../video-actions";

export const metadata: Metadata = { title: "Voices", robots: { index: false } };

// v4-flash ids from Sarvam's docs: the default is shubh_enhi_ads (Hinglish, advert style). More are listed
// in the Sarvam dashboard and can be typed into the Voice box.
const suggestions = ["shubh_enhi_ads", ...V3_SPEAKERS];

export default async function AdminVoices({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const { saved, error } = await searchParams;
  const settings = await loadVoiceSettings();
  return (
    <section className="wrap section-tight stack" style={{ gap: 22, maxWidth: 900 }}>
      <div>
        <p className="eyebrow">Admin · <Link href="/sample-video">Sample videos</Link></p>
        <h1 className="portal-title">Website voices</h1>
        <p className="muted">
          Try voices on the real script, then pick one. Each Listen costs well under ₹1 (Sarvam, ₹3 per 1,000 characters). The website switches
          to a new voice as soon as you save it.
        </p>
      </div>
      {!voiceConfigured() && <p className="notice" role="alert">SARVAM_API_KEY isn&apos;t set, so nothing can be heard yet.</p>}
      {saved && <p className="notice notice-inline" role="status">Saved. The website uses the new voice now.</p>}
      {error && <p className="notice notice-inline" role="alert">That voice id or model isn&apos;t valid.</p>}
      {voiceSources.map((s) => {
        const c = settings[s.id];
        return (
          <div key={s.id} className="card stack" style={{ gap: 12 }}>
            <h3>{s.label}</h3>
            <p className="fine">
              Now: {c ? `${c.speaker} · ${c.model} · ${c.pace}×` : `${s.speaker} · ${VOICE_MODEL} · 1× (default)`}. Reads: &quot;{(s.full ?? s.lines[0]).slice(0, 120)}…&quot;
            </p>
            <VoiceAudition source={s.id} model={c?.model ?? VOICE_MODEL} speaker={c?.speaker ?? s.speaker} pace={c?.pace ?? 1} speakers={suggestions} save={saveVoice} />
            {c && (
              <form action={resetVoice}><input type="hidden" name="source" value={s.id} /><button className="btn btn-ghost btn-sm" type="submit">Back to default</button></form>
            )}
          </div>
        );
      })}
    </section>
  );
}
