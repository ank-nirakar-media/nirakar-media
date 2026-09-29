import { NextResponse } from "next/server";
import { one, query } from "@/lib/db";

// Lets a client's own website form, WhatsApp bot or CRM report a lead:
// POST /api/leads  { "key": "<client lead key>", "source": "website-form" }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { key?: string; source?: string };
  const client = body.key ? await one<{ id: number }>("SELECT id FROM clients WHERE lead_key = $1", [body.key]) : undefined;
  if (!client) return NextResponse.json({ error: "Unknown key" }, { status: 401 });
  await query("INSERT INTO leads (client_id, source) VALUES ($1, $2)", [client.id, String(body.source || "api").slice(0, 60)]);
  return NextResponse.json({ ok: true });
}
