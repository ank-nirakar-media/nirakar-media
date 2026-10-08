import { NextResponse } from "next/server";
import { recordSubscription, offerStatus } from "@/lib/offer";
import { getPlan } from "@/lib/plans";
import { createSubscription, ensurePlan, razorpayConfigured } from "@/lib/razorpay";
import { siteUrl } from "@/lib/site-url";

// Plan buttons are plain HTML forms that POST here. We create a Razorpay
// subscription, then send the visitor to /checkout/pay, which opens Razorpay
// Checkout for them to authorise the recurring payment.
export async function POST(req: Request) {
  const base = siteUrl(req);
  const form = await req.formData();
  const plan = getPlan(String(form.get("plan") || ""));
  if (!plan) {
    return NextResponse.redirect(`${base}/pricing?error=plan`, 303);
  }
  if (!razorpayConfigured()) {
    return NextResponse.redirect(`${base}/contact?plan=${plan.id}&checkout=unavailable`, 303);
  }

  const extraLanguages = Math.min(3, Math.max(0, Math.floor(Number(form.get("extraLanguages")) || 0)));
  try {
    // The founding offer is decided here, on the server, from the live seat count and end date.
    const { open: offer } = await offerStatus();
    const planId = await ensurePlan(plan, extraLanguages, offer);
    const sub = await createSubscription(planId, { plan: plan.id, extraLanguages: String(extraLanguages), offer: offer ? "founding" : "" });
    await recordSubscription(sub.id, plan.id, offer);
    const params = new URLSearchParams({ sub: sub.id, plan: plan.id, lang: String(extraLanguages), offer: offer ? "1" : "0" });
    return NextResponse.redirect(`${base}/checkout/pay?${params}`, 303);
  } catch (err) {
    console.error("Razorpay checkout failed", err);
    return NextResponse.redirect(`${base}/pricing?error=checkout`, 303);
  }
}
