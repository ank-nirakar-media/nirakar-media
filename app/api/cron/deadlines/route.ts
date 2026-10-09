import { NextResponse } from "next/server";
import { processDeadlines } from "@/lib/pipeline";
import { publishDue } from "@/lib/publish";

// Second daily run (see vercel.json) so approval reminders and auto-approvals don't wait a full
// day. They also run whenever anyone opens the portal. It runs at 7 pm in India, so approved videos
// due today are posted then.
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deadlines = await processDeadlines();
  return NextResponse.json({ ...deadlines, published: await publishDue() });
}
