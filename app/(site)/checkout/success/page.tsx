import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Welcome aboard", robots: { index: false } };

export default function SuccessPage() {
  return (
    <section className="wrap page-hero" style={{ paddingBottom: 96 }}>
      <p className="eyebrow">Subscription active</p>
      <h1>You are in. <span className="grad-text">Let&apos;s start your engine.</span></h1>
      <p className="lead">
        Your payment is authorised and your subscription is active. We are emailing your onboarding brief now. Fill it in
        and your research and first content plan arrive within three working days.
      </p>
      <div className="btn-row"><Link href="/" className="btn btn-ghost">Back to home</Link></div>
    </section>
  );
}
