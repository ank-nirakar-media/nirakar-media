// AI voice from Sarvam Bulbul (https://docs.sarvam.ai/api-reference-docs/text-to-speech/convert).
// Checked against the docs on 2026-10-08: POST https://api.sarvam.ai/text-to-speech with header
// api-subscription-key, body { text, language_code, model, speaker, output_audio_codec }, response
// { audios: [base64] }. Sarvam reads Hindi best in Devanagari, so Hinglish lines are sent in Devanagari.

export const voiceConfigured = () => Boolean(process.env.SARVAM_API_KEY);

export const VOICE_MODEL = "bulbul:v3";
export const VOICE_MODELS = ["bulbul:v3", "bulbul:v4-flash"] as const;
export const VOICE_MAX_CHARS = 2500;

// The 37 bulbul:v3 speakers listed in Sarvam's API reference on 2026-10-08. bulbul:v4-flash has 200+
// persona voices named like shubh_hi_devotional; its full list is only in the Sarvam dashboard.
export const V3_SPEAKERS = [
  "shubh", "aditya", "ritu", "priya", "neha", "rahul", "pooja", "rohan", "simran", "kavya", "amit", "dev", "ishita",
  "shreya", "ratan", "varun", "manan", "sumit", "roopa", "kabir", "aayan", "ashutosh", "advait", "anand", "tanya",
  "tarun", "sunny", "mani", "gokul", "vijay", "shruti", "suhani", "mohit", "kavitha", "rehan", "soham", "rupali",
];

export type VoiceRequest = { text: string; languageCode: string; speaker: string; model?: string; pace?: number };

// Speaker ids are lowercase letters, digits and underscores (Sarvam docs: names are case-sensitive, lowercase).
export const validSpeaker = (s: string) => /^[a-z][a-z0-9_]{1,60}$/.test(s);

export async function synthesize(r: VoiceRequest): Promise<{ ok: true; audio: Buffer } | { ok: false; error: string }> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) return { ok: false, error: "SARVAM_API_KEY is not set" };
  if (!r.text.trim() || r.text.length > VOICE_MAX_CHARS) return { ok: false, error: "text is empty or too long" };
  try {
    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "api-subscription-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text: r.text, language_code: r.languageCode, model: r.model ?? VOICE_MODEL, speaker: r.speaker, pace: r.pace ?? 1, output_audio_codec: "mp3" }),
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
