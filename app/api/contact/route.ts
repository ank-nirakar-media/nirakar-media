import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site-url";

const fields = ["name", "email", "phone", "business", "plan", "message"] as const;

export async function POST(req: Request) {
  const base = siteUrl(req);
  const form = await req.formData();

  // Honeypot: real visitors never fill the hidden "website" field.
  if (form.get("website")) {
    return NextResponse.redirect(`${base}/contact?sent=1`, 303);
  }

  const lead = Object.fromEntries(
    fields.map((f) => [f, String(form.get(f) || "").trim().slice(0, 2000)]),
  );
  if (!lead.name || !lead.email.includes("@")) {
    return NextResponse.redirect(`${base}/contact?error=1`, 303);
  }

  const url = process.env.CONTACT_WEBHOOK_URL;
  if (url) {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "lead", ...lead, receivedAt: new Date().toISOString() }),
      });
    } catch (err) {
      console.error("Contact webhook failed", err);
      return NextResponse.redirect(`${base}/contact?error=1`, 303);
    }
  } else {
    console.log("New lead", lead);
  }

  return NextResponse.redirect(`${base}/contact?sent=1`, 303);
}
