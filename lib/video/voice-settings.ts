// Voices picked in Admin > Voices. Read by the voice route and by pages, which pass a short key to the
// players so a new choice gets a new audio URL (the CDN caches each URL for a year).
import { query } from "../db";
import { VOICE_MODELS, validSpeaker } from "./voice";
import { voiceSources } from "./voices";

export type VoiceChoice = { model: string; speaker: string; pace: number };
export type VoiceSettings = Record<string, VoiceChoice>;

export async function loadVoiceSettings(): Promise<VoiceSettings> {
  try {
    const rows = await query<{ source: string; model: string; speaker: string; pace: number }>("SELECT source, model, speaker, pace FROM voice_settings");
    return Object.fromEntries(rows.map((r) => [r.source, { model: r.model, speaker: r.speaker, pace: Number(r.pace) }]));
  } catch (err) {
    console.error("Voice settings unavailable", err); // fall back to the default voices
    return {};
  }
}

export async function saveVoiceChoice(source: string, c: VoiceChoice, by: string) {
  if (!voiceSources.some((x) => x.id === source)) return false;
  if (!VOICE_MODELS.includes(c.model as (typeof VOICE_MODELS)[number]) || !validSpeaker(c.speaker)) return false;
  const pace = Math.min(2, Math.max(0.5, Number(c.pace) || 1));
  await query(
    `INSERT INTO voice_settings (source, model, speaker, pace, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (source) DO UPDATE SET model = $2, speaker = $3, pace = $4, updated_by = $5, updated_at = now()`,
    [source, c.model, c.speaker, pace, by],
  );
  return true;
}

export async function resetVoiceChoice(source: string) {
  await query("DELETE FROM voice_settings WHERE source = $1", [source]);
}

// A short key that changes whenever any choice changes. "d" when everything is on its default.
export function settingsKey(s: VoiceSettings): string {
  const parts = Object.keys(s).sort().map((k) => `${k}:${s[k].model}:${s[k].speaker}:${s[k].pace}`);
  if (!parts.length) return "d";
  let h = 5381;
  for (const c of parts.join("|")) h = ((h * 33) ^ c.codePointAt(0)!) >>> 0;
  return h.toString(36);
}
