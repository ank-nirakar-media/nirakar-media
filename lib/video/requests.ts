// Free sample video requests from the website demo. Nothing is generated automatically:
// the team reviews each request, makes the video, and marks it sent.
import { one, query } from "../db";
import { sendEmail } from "../email";
import { teamRecipients } from "../notify";
import { configuredSiteUrl } from "../site-url";

export const SAMPLE_STATUSES = ["new", "approved", "declined", "sent"] as const;
export type SampleStatus = (typeof SAMPLE_STATUSES)[number];
export type SampleRequest = {
  id: number; name: string; business: string; email: string; phone: string; niche: string; language: string; topic: string;
  status: SampleStatus; note: string; created_at: string;
};

export const SAMPLE_LANGUAGES = ["Hindi", "English", "Hinglish", "Marathi", "Tamil", "Telugu", "Kannada", "Bengali", "Gujarati", "Malayalam", "Punjabi", "Odia"];

// Indian numbers are written many ways (+91, 0, spaces). The last 10 digits identify one number.
export function phoneKey(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

type Input = { name: string; business: string; email: string; phone: string; niche: string; language: string; topic: string };

export async function createSampleRequest(i: Input): Promise<"ok" | "invalid" | "duplicate"> {
  const key = phoneKey(i.phone);
  if (!i.name || !i.business || !i.email.includes("@") || !key) return "invalid";
  const row = await one<{ id: number }>(
    `INSERT INTO sample_requests (name, business, email, phone, phone_key, niche, language, topic)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (phone_key) DO NOTHING RETURNING id`,
    [i.name, i.business, i.email, i.phone, key, i.niche, SAMPLE_LANGUAGES.includes(i.language) ? i.language : "", i.topic],
  );
  if (!row) return "duplicate";
  const subject = `Free sample request: ${i.business}`;
  const site = configuredSiteUrl() ?? "https://www.nirakarmedia.com";
  try {
    for (const to of await teamRecipients()) {
      await sendEmail({
        to, kind: "team-sample-request", subject, heading: subject,
        lines: [`${i.name} (${i.email}, ${i.phone}) asked for a free sample video.`, `Business: ${i.business}${i.niche ? `, ${i.niche}` : ""}`, `Language: ${i.language || "not given"}`, ...(i.topic ? [`Topic: ${i.topic}`] : [])],
        button: { label: "Review requests", url: `${site}/admin/samples` },
      });
    }
  } catch (err) {
    console.error("Sample request email failed", err); // the request is saved either way
  }
  return "ok";
}

export async function listSampleRequests() {
  return query<SampleRequest>("SELECT id, name, business, email, phone, niche, language, topic, status, note, created_at::text FROM sample_requests ORDER BY id DESC LIMIT 200");
}

export async function setSampleStatus(id: number, status: string, note: string) {
  if (!SAMPLE_STATUSES.includes(status as SampleStatus)) return false;
  await query("UPDATE sample_requests SET status = $2, note = $3, updated_at = now() WHERE id = $1", [id, status, note.slice(0, 1000)]);
  return true;
}
