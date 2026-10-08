import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site-url";
import { createSampleRequest } from "@/lib/video/requests";

const fields = ["name", "business", "email", "phone", "niche", "language", "topic"] as const;

export async function POST(req: Request) {
  const back = `${siteUrl(req)}/sample-video`;
  const form = await req.formData();
  // Honeypot: real visitors never fill the hidden "website" field.
  if (form.get("website")) return NextResponse.redirect(`${back}?sent=1#free-sample`, 303);

  const input = Object.fromEntries(fields.map((f) => [f, String(form.get(f) || "").trim().slice(0, f === "topic" ? 500 : 120)])) as Record<(typeof fields)[number], string>;
  const result = await createSampleRequest(input);
  const flag = result === "ok" ? "sent=1" : result === "duplicate" ? "already=1" : "error=1";
  return NextResponse.redirect(`${back}?${flag}#free-sample`, 303);
}
