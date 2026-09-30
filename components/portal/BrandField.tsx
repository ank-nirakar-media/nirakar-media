import type { Answers, Field } from "@/lib/brand";

// One Brand Brain question as a form control, prefilled with the saved answer.
export function BrandField({ field, data, note }: { field: Field; data: Answers; note?: string }) {
  const value = data[field.key];
  const text = typeof value === "string" ? value : "";
  const list = Array.isArray(value) ? value : [];
  const id = `f-${field.key}`;
  const hint = [field.hint, note].filter(Boolean).join(" ");

  if (field.kind === "checks") {
    return (
      <fieldset className="field chips-field">
        <legend>{field.label}</legend>
        {hint && <p className="fine">{hint}</p>}
        <div className="chip-options">
          {field.options!.map((o) => (
            <label key={o} className="chip-option">
              <input type="checkbox" name={field.key} value={o} defaultChecked={list.includes(o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <div className="field">
      <label htmlFor={id}>{field.label}</label>
      {hint && <p className="fine">{hint}</p>}
      {field.kind === "textarea" ? (
        <textarea id={id} name={field.key} defaultValue={text} placeholder={field.placeholder} rows={4} />
      ) : field.kind === "select" ? (
        <select id={id} name={field.key} defaultValue={text}>
          <option value="">Choose one</option>
          {field.groups!.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </optgroup>
          ))}
        </select>
      ) : (
        // Links are plain text so "mybrand.com" is accepted; https:// is added when saved.
        <input id={id} name={field.key} type="text" inputMode={field.kind === "url" ? "url" : undefined} defaultValue={text} placeholder={field.placeholder} />
      )}
    </div>
  );
}

// Read-only display of an answer.
export function BrandAnswer({ field, data }: { field: Field; data: Answers }) {
  const v = data[field.key];
  const empty = Array.isArray(v) ? v.length === 0 : !v;
  return (
    <div className="brand-answer">
      <span className="brand-q">{field.label}</span>
      {empty ? (
        <span className="muted">Not added yet</span>
      ) : Array.isArray(v) ? (
        <span className="chip-list">{v.map((x) => <span key={x} className="chip">{x}</span>)}</span>
      ) : field.kind === "url" ? (
        <a href={v} target="_blank" rel="noreferrer noopener" className="brand-link">{v}</a>
      ) : (
        <span className="brand-text">{v}</span>
      )}
    </div>
  );
}
