import { NextResponse } from "next/server";
import { processDeadlines } from "@/lib/pipeline";

// Second daily run (see vercel.json) so approval reminders and auto-approvals don't wait a full
// day. They also run whenever anyone opens the portal.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await processDeadlines());
}
