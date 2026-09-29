import type { Metadata } from "next";
import { plans } from "@/lib/plans";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to Nirakar Media about faceless video plans, custom long-form work or agency volume.",
};

type Search = { plan?: string; sent?: string; error?: string; checkout?: string };

export default async function ContactPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { plan = "", sent, error, checkout } = await searchParams;
  return (
    <>
      <section className="wrap page-hero">
        <p className="eyebrow">Contact</p>
        {plan === "audit" ? (
          <>
            <h1>Book a free <span className="grad-text">content audit</span></h1>
            <p className="lead">Share your channel or business and we&apos;ll review your content, your competitors and your best opportunities, then walk you through it on a 30-minute call. No charge, no obligation.</p>
          </>
        ) : (
          <>
            <h1>Tell us about <span className="grad-text">your channel</span></h1>
            <p className="lead">Questions, a custom plan, or not sure where to start? Send a note and we reply within one working day.</p>
          </>
        )}
      </section>
      <section className="section-tight">
        <div className="wrap contact-grid">
          <div className="card">
            {sent && <p className="notice" role="status">Thanks, your message is in. We will reply within one working day.</p>}
            {error && <p className="notice" role="alert">Please add your name and a valid email address, then send again.</p>}
            {checkout === "unavailable" && (
              <p className="notice" role="status">Online checkout is being set up. Send this form and we will email you a secure payment link for your plan.</p>
            )}
            <form className="form" action="/api/contact" method="post">
              <div className="grid-2" style={{ gap: 16 }}>
                <div className="field">
                  <label htmlFor="name">Your name</label>
                  <input id="name" name="name" required autoComplete="name" />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="field">
                  <label htmlFor="phone">WhatsApp or phone (optional)</label>
                  <input id="phone" name="phone" type="tel" autoComplete="tel" />
                </div>
                <div className="field">
                  <label htmlFor="business">Channel or business link (optional)</label>
                  <input id="business" name="business" placeholder="youtube.com/@yourchannel" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="plan">Plan you are interested in</label>
                <select id="plan" name="plan" defaultValue={plan}>
                  <option value="audit">Free content audit</option>
                  <option value="">Not sure yet</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  <option value="custom">Long-form, multi-channel or agency</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="message">What would you like to make?</label>
                <textarea id="message" name="message" placeholder="Your niche, audience, and how often you want to post" />
              </div>
              <div className="hp" aria-hidden="true">
                <label htmlFor="website">Leave this empty</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <div><button type="submit" className="btn btn-primary">Send message</button></div>
            </form>
          </div>
          <aside className="card">
            <p className="eyebrow">Reach us directly</p>
            <div className="contact-line"><span>Email</span><b>{site.email}</b></div>
            {site.whatsapp && <div className="contact-line"><span>WhatsApp</span><b>{site.whatsapp}</b></div>}
            <div className="contact-line"><span>Hours</span><b>Mon to Sat, 10 AM to 7 PM IST</b></div>
            <p>Already sure? Subscribe from the pricing page and your onboarding brief arrives by email right after payment.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
