import { NextResponse } from "next/server";
import { setSubscriptionStatus } from "@/lib/offer";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { siteUrl } from "@/lib/site-url";

// Razorpay Checkout posts here (callback_url) after the customer authorises
// the subscription. We only trust the payment once the signature checks out.
export async function POST(req: Request) {
  const base = siteUrl(req);
  const form = await req.formData();
  const paymentId = String(form.get("razorpay_payment_id") || "");
  const subscriptionId = String(form.get("razorpay_subscription_id") || "");
  const signature = String(form.get("razorpay_signature") || "");

  if (!paymentId || !subscriptionId || !verifyPaymentSignature(paymentId, subscriptionId, signature)) {
    console.warn("Razorpay signature check failed", { paymentId, subscriptionId });
    return NextResponse.redirect(`${base}/checkout/cancel?error=verify`, 303);
  }
  try {
    await setSubscriptionStatus(subscriptionId, "authenticated", true);
  } catch (err) {
    console.error("Could not record the subscription", err);
  }
  return NextResponse.redirect(`${base}/checkout/success?sub=${encodeURIComponent(subscriptionId)}`, 303);
}
