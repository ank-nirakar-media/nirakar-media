// Sends email through Resend (resend.com). Without RESEND_API_KEY nothing is sent; the
// attempt is still logged so Admin > Emails shows what would have gone out.
import { query } from "./db";

const API = () => process.env.RESEND_API_BASE || "https://api.resend.com";
export const emailFrom = () => process.env.EMAIL_FROM || "Nirakar Media <hello@nirakarmedia.com>";
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export type Mail = { to: string; subject: string; heading: string; lines: string[]; button?: { label: string; url: string }; kind: string; itemId?: number };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function html(m: Mail) {
  const p = m.lines.map((l) => `<p style="margin:0 0 14px;line-height:1.6;white-space:pre-line">${esc(l)}</p>`).join("");
  const btn = m.button
    ? `<p style="margin:22px 0"><a href="${esc(m.button.url)}" style="background:#8b5cf6;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">${esc(m.button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f2fb;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1b1840">
<div style="max-width:560px;margin:0 auto;padding:28px 18px">
<p style="font-weight:700;letter-spacing:.08em;color:#6d28d9;margin:0 0 18px">NIRAKAR MEDIA</p>
<div style="background:#fff;border-radius:16px;padding:26px 24px;border:1px solid #e5e0f5">
<h1 style="font-size:20px;margin:0 0 16px">${esc(m.heading)}</h1>${p}${btn}</div>
<p style="font-size:12px;color:#6b6890;margin:16px 4px">You get this because you have a login to the Nirakar Media client portal.</p>
</div></body></html>`;
}

function text(m: Mail) {
  return [m.heading, "", ...m.lines, ...(m.button ? ["", `${m.button.label}: ${m.button.url}`] : [])].join("\n");
}

// Never throws: a failed email must not undo an approval or a save.
export async function sendEmail(m: Mail): Promise<"sent" | "skipped" | "failed"> {
  let status: "sent" | "skipped" | "failed" = "skipped";
  let error = "";
  if (emailConfigured()) {
    try {
      const res = await fetch(`${API()}/emails`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ from: emailFrom(), to: [m.to], subject: m.subject, html: html(m), text: text(m) }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) status = "sent";
      else {
        status = "failed";
        error = `${res.status} ${(await res.text()).slice(0, 300)}`;
      }
    } catch (e) {
      status = "failed";
      error = (e as Error).message.slice(0, 300);
    }
  } else {
    error = "RESEND_API_KEY is not set";
  }
  if (status === "failed") console.error("Email failed", m.to, m.subject, error);
  try {
    await query("INSERT INTO email_log (to_email, subject, kind, item_id, status, error) VALUES ($1, $2, $3, $4, $5, $6)",
      [m.to, m.subject, m.kind, m.itemId ?? null, status, error]);
  } catch (e) {
    console.error("Email log failed", e);
  }
  return status;
}
