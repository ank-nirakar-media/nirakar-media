import type { Metadata } from "next";
import { Cta } from "@/components/Cta";
import { steps } from "@/lib/content";

export const metadata: Metadata = {
  title: "How it works",
  description: "How the Nirakar Media content engine runs each month, and what you do versus what we do.",
};

const yours = ["Share your goals in a 20-minute brief", "Approve one content plan a month", "Review videos in the shared folder", "Connect your social accounts once"];
const ours = ["Find ideas and study your competitors", "Build the content strategy and calendar", "Write and fact-check every script", "Produce voice, avatar, edits and thumbnails", "Optimise, publish and repurpose everywhere", "Report on what worked", "Recommend what to make next"];

export default function HowItWorksPage() {
  return (
    <>
      <section className="wrap page-hero">
        <p className="eyebrow">How it works</p>
        <h1>You run your business. <span className="grad-text">We run the engine.</span></h1>
        <p className="lead">Each month is one full cycle of research, planning, production, publishing and learning. You approve the plan and the videos; we do everything else.</p>
      </section>
      <section className="section-tight">
        <div className="wrap">
          <ol className="steps" style={{ maxWidth: 860 }}>
            {steps.map((s) => (
              <li key={s.title} className="step">
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="section">
        <div className="wrap grid-2">
          <div className="card">
            <p className="eyebrow">What you do</p>
            <ul className="checks">{yours.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div className="card">
            <p className="eyebrow">What we do</p>
            <ul className="checks">{ours.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
      </section>
      <Cta />
    </>
  );
}
