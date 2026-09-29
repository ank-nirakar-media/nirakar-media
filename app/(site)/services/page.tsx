import type { Metadata } from "next";
import { Cta } from "@/components/Cta";
import { Engine } from "@/components/Engine";
import { HumanAi } from "@/components/HumanAi";
import { ServiceIcon } from "@/components/ServiceIcon";
import { engine, stageCount } from "@/lib/content";
import { plans } from "@/lib/plans";

export const metadata: Metadata = {
  title: "The content engine",
  description: "Idea discovery to next-content recommendations: every stage Nirakar Media runs for your channel each month, and who does it.",
};

function tierLabel(tiers: string[]) {
  if (tiers.length === plans.length) return "All plans";
  const first = plans.find((p) => tiers.includes(p.id));
  return first ? `${first.name} and up` : "";
}

export default function EnginePage() {
  return (
    <>
      <section className="wrap page-hero">
        <p className="eyebrow">The content engine</p>
        <h1>{stageCount} stages. One team. <span className="grad-text">Every month.</span></h1>
        <p className="lead">
          Most agencies sell you videos. We run the system that decides which videos to make, makes them, puts them
          everywhere and learns from the results.
        </p>
      </section>
      <section className="section-tight">
        <div className="wrap"><Engine /></div>
      </section>
      <section className="section-tight">
        <div className="wrap"><HumanAi /></div>
      </section>
      <section className="section">
        <div className="wrap">
          {engine.map((phase) => (
            <div key={phase.slug} id={phase.slug} className="service-row">
              <div>
                <ServiceIcon slug={phase.slug} />
                <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>{phase.title}</h2>
                <p className="lead">{phase.summary}</p>
              </div>
              <div className="stage-rows">
                {phase.stages.map((s) => (
                  <div key={s.name} className="stage-row">
                    <b>{s.name}</b>
                    <p>{s.detail}</p>
                    <span className="stage-tags"><span className={`owner-tag owner-${s.owner.startsWith("AI +") ? "mix" : s.owner.toLowerCase()}`}>{s.owner}</span><span className="tier-tag">{tierLabel(s.tiers)}</span></span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <Cta />
    </>
  );
}
