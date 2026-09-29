import { engine } from "@/lib/content";
import { ServiceIcon } from "./ServiceIcon";

// The five phases as a loop: Learn feeds back into Discover.
export function Engine() {
  return (
    <div className="engine">
      {engine.map((phase, i) => (
        <div key={phase.slug} className="engine-phase">
          <div className="engine-head">
            <ServiceIcon slug={phase.slug} />
            <span className="engine-index">{String(i + 1).padStart(2, "0")}</span>
          </div>
          <h3>{phase.title}</h3>
          <p>{phase.summary}</p>
          <ul className="stage-list">
            {phase.stages.map((s) => (
              <li key={s.name}>{s.name}</li>
            ))}
          </ul>
        </div>
      ))}
      <div className="engine-loop" aria-hidden="true">
        <span>Learn feeds the next Discover, every cycle</span>
      </div>
    </div>
  );
}
