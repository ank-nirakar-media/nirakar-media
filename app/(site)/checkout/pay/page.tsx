import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatInr, getPlan } from "@/lib/plans";
import { planAmountInr, planName } from "@/lib/razorpay";
import { PayButton } from "./PayButton";

export const metadata: Metadata = { title: "Complete your subscription", robots: { index: false } };

type Search = { sub?: string; plan?: string; lang?: string };

export default async function PayPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { sub = "", plan: planId = "", lang = "0" } = await searchParams;
  const plan = getPlan(planId);
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!plan || !/^sub_[A-Za-z0-9]+$/.test(sub) || !keyId) redirect("/pricing?error=checkout");

  const extra = Math.min(3, Math.max(0, Number(lang) || 0));
  const h = await headers();
  const site = (process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") || "https"}://${h.get("host")}`).replace(/\/$/, "");
  return (
    <section className="wrap page-hero" style={{ paddingBottom: 96 }}>
      <p className="eyebrow">Secure checkout</p>
      <h1>{planName(plan, extra).replace("Nirakar Media ", "")}</h1>
      <p className="lead">
        {formatInr(planAmountInr(plan, extra))} a month, billed through Razorpay. ₹0 setup, cancel any time. Your bank may ask you
        to approve the recurring payment (RBI e-mandate).
      </p>
      <div className="btn-row">
        <PayButton
          keyId={keyId}
          subscriptionId={sub}
          description={planName(plan, extra)}
          callbackUrl={`${site}/api/checkout/verify`}
          cancelUrl={`${site}/checkout/cancel?plan=${plan.id}`}
        />
        <Link href="/pricing" className="btn btn-ghost">Change plan</Link>
      </div>
    </section>
  );
}
