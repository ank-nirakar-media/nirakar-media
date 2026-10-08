// AI voice from Sarvam Bulbul (https://docs.sarvam.ai/api-reference-docs/text-to-speech/convert).
// Checked against the docs on 2026-10-08: POST https://api.sarvam.ai/text-to-speech with header
// api-subscription-key, body { text, language_code, model, speaker, output_audio_codec }, response
// { audios: [base64] }. Sarvam reads Hindi best in Devanagari, so Hinglish lines are sent in Devanagari.

export const voiceConfigured = () => Boolean(process.env.SARVAM_API_KEY);

export const VOICE_MODEL = "bulbul:v3";
export const VOICE_MAX_CHARS = 2500;

export type VoiceRequest = { text: string; languageCode: string; speaker: string; pace?: number };

export async function synthesize(r: VoiceRequest): Promise<{ ok: true; audio: Buffer } | { ok: false; error: string }> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) return { ok: false, error: "SARVAM_API_KEY is not set" };
  if (!r.text.trim() || r.text.length > VOICE_MAX_CHARS) return { ok: false, error: "text is empty or too long" };
  try {
    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "api-subscription-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text: r.text, language_code: r.languageCode, model: VOICE_MODEL, speaker: r.speaker, pace: r.pace ?? 1, output_audio_codec: "mp3" }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return { ok: false, error: `Sarvam ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const data = (await res.json()) as { audios?: string[] };
    if (!data.audios?.length) return { ok: false, error: "Sarvam returned no audio" };
    return { ok: true, audio: Buffer.from(data.audios.join(""), "base64") };
  } catch (err) {
    return { ok: false, error: `Sarvam request failed: ${(err as Error).message}` };
  }
}
