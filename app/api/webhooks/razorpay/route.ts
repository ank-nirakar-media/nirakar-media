import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";

// In the Razorpay Dashboard (Accounts & Settings > Webhooks) point a webhook at
// /api/webhooks/razorpay with the subscription.* and payment.failed events.
type Entity = { id?: string; status?: string; notes?: Record<string, string>; email?: string; contact?: string };
type Payload = { event: string; payload: { subscription?: { entity: Entity }; payment?: { entity: Entity } } };

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body) as Payload;
  const sub = event.payload.subscription?.entity;
  const payment = event.payload.payment?.entity;
  const plan = sub?.notes?.plan;

  switch (event.event) {
    case "subscription.activated":
      await notify(`New ${plan} client activated: ${sub?.id} ${payment?.email ?? ""}`);
      break;
    case "subscription.charged":
      console.log("Renewal charged", { id: sub?.id, plan });
      break;
    case "subscription.pending":
    case "subscription.halted":
    case "payment.failed":
      await notify(`Payment problem (${event.event}) on ${sub?.id ?? payment?.id} ${payment?.email ?? ""}`);
      break;
    case "subscription.cancelled":
    case "subscription.completed":
      await notify(`Subscription ended (${event.event}): ${sub?.id} (${plan})`);
      break;
  }
  return NextResponse.json({ received: true });
}

async function notify(text: string) {
  console.log(text);
  const url = process.env.CONTACT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "razorpay", text }),
    });
  } catch (err) {
    console.error("Notify webhook failed", err);
  }
}
