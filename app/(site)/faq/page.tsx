import type { Metadata } from "next";
import { Cta } from "@/components/Cta";
import { faqs } from "@/lib/content";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about faceless videos, ownership, AI voices, billing and publishing with Nirakar Media.",
};

export default function FaqPage() {
  return (
    <>
      <section className="wrap page-hero">
        <p className="eyebrow">FAQ</p>
        <h1>Good questions, <span className="grad-text">straight answers</span></h1>
      </section>
      <section className="section-tight">
        <div className="wrap faq">
          {faqs.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      <Cta />
    </>
  );
}
