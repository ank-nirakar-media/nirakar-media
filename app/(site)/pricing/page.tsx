import type { Metadata } from "next";
import { Plans } from "@/components/Plans";
import { StageTable } from "@/components/StageTable";
import { faqs } from "@/lib/content";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Content Growth as a Service from ₹4,999 a month. ₹0 setup, month-to-month, and you keep 100% of ad revenue.",
};



export default async function PricingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <section className="wrap page-hero">
        <p className="eyebrow">Pricing</p>
        <h1>Choose how much of the <span className="grad-text">engine you need</span></h1>
        <p className="lead">All prices in INR. ₹0 setup, month-to-month, cancel before your next billing date. You keep 100% of your ad revenue.</p>
      </section>
      <section className="section-tight">
        <div className="wrap">
          {error && (
            <p className="notice" role="alert">
              We could not start checkout. Please try again, or contact us and we will send you a payment link.
            </p>
          )}
          <Plans />
        </div>
      </section>
      <section className="section">
        <div className="wrap stack" id="stages" style={{ gap: 24 }}>
          <h2>Which stages each plan runs</h2>
          <StageTable />
          <p className="fine">Prices exclude GST where applicable. Recurring card payments in India follow RBI e-mandate rules, so your bank may ask you to approve renewals.</p>
        </div>
      </section>
      <section className="section-tight">
        <div className="wrap faq">
          <h2 style={{ marginBottom: 12 }}>Billing questions</h2>
          {faqs.filter((f) => /setup|payment|own|long-form/i.test(f.q)).map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
