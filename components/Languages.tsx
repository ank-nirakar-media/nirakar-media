import { languages, moreLanguages } from "@/lib/plans";

// The regional-language pitch: one video, many languages.
export function Languages() {
  return (
    <div className="lang-grid">
      <div className="lang-source">
        <span className="eyebrow">1 video</span>
        <b>English original</b>
        <span className="muted">Script, voice and edit approved once</span>
      </div>
      <div className="lang-arrow" aria-hidden="true" />
      <ul className="lang-targets">
        {languages.slice(1).map((l) => (
          <li key={l}>{l}</li>
        ))}
        <li className="lang-more">+ {moreLanguages.join(", ")} on request</li>
      </ul>
    </div>
  );
}
