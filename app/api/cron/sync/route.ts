import { NextResponse } from "next/server";
import { syncConnections } from "@/lib/sync";

// Called daily by Vercel Cron (see vercel.json) with Authorization: Bearer CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await syncConnections();
  return NextResponse.json({ synced: results.length, results });
}
