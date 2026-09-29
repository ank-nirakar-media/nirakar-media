import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Checkout cancelled", robots: { index: false } };

export default function CancelPage() {
  return (
    <section className="wrap page-hero" style={{ paddingBottom: 96 }}>
      <p className="eyebrow">Checkout cancelled</p>
      <h1>No payment was taken</h1>
      <p className="lead">You can pick a plan again whenever you are ready, or ask us anything first.</p>
      <div className="btn-row">
        <Link href="/pricing" className="btn btn-primary">Back to plans</Link>
        <Link href="/contact" className="btn btn-ghost">Ask a question</Link>
      </div>
    </section>
  );
}
