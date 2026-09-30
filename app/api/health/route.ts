import { configuredSiteUrl } from "@/lib/site-url";
import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { encryptionKeyStatus } from "@/lib/crypto";
import { razorpayKeyStatus } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

// Setup check: says which settings are present and working. Never returns their values.
export async function GET() {
  const set = (k: string) => (process.env[k] ? "set" : "missing");
  let database = "missing";
  let adminCreated = false;
  if (process.env.DATABASE_URL) {
    try {
      adminCreated = Boolean(await one("SELECT id FROM users WHERE role = 'admin' LIMIT 1"));
      database = "ok";
    } catch (e) {
      database = `error (${(e as Error).message.slice(0, 80)})`;
    }
  }
  const cron = process.env.CRON_SECRET ?? "";
  return NextResponse.json({
    // Which Vercel project and deployment answered (public info, helps spot a domain on the wrong project).
    deployment: {
      project: process.env.VERCEL_PROJECT_PRODUCTION_URL || "unknown",
      url: process.env.VERCEL_URL || "unknown",
      env: process.env.VERCEL_ENV || "unknown",
      commit: (process.env.VERCEL_GIT_COMMIT_SHA || "unknown").slice(0, 7),
    },
    siteUrl: configuredSiteUrl() || "missing",
    database,
    adminCreated,
    encryptionKey: encryptionKeyStatus(),
    cronSecret: !cron ? "missing" : cron.length < 16 ? "too short" : "ok",
    razorpay: await razorpayKeyStatus(),
    razorpayWebhookSecret: set("RAZORPAY_WEBHOOK_SECRET"),
    youtube: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "set" : "not yet",
    instagram: process.env.META_APP_ID && process.env.META_APP_SECRET ? "set" : "not yet",
    contactWebhook: set("CONTACT_WEBHOOK_URL"),
    contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "default (hello@nirakarmedia.com)",
  });
}
