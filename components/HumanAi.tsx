import { aiHandles, humansControl } from "@/lib/content";

export function HumanAi() {
  return (
    <div className="human-ai">
      <div className="ha-col">
        <p className="eyebrow">AI does the heavy lifting</p>
        <ul className="ai-chips">
          {aiHandles.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p className="muted">Fast, tireless and consistent, so we can produce more for less.</p>
      </div>
      <div className="ha-col ha-human">
        <p className="eyebrow">People make the calls</p>
        <ul className="human-list">
          {humansControl.map((h) => (
            <li key={h.title}>
              <b>{h.title}</b>
              <span>{h.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
