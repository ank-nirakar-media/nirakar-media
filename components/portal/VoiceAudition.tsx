"use client";

import { useState } from "react";

// Pick a model, voice and pace, press Listen, and hear the real script. Errors from Sarvam (for
// example an unknown voice id) are shown as they come back.
export function VoiceAudition({ source, model, speaker, pace, speakers, save }: {
  source: string; model: string; speaker: string; pace: number; speakers: string[]; save: (form: FormData) => Promise<void>;
}) {
  const [m, setM] = useState(model);
  const [sp, setSp] = useState(speaker);
  const [p, setP] = useState(pace);
  const [src, setSrc] = useState<string>();
  const [status, setStatus] = useState("");
  const listId = `speakers-${source}`;

  async function listen() {
    setStatus("Making the audio...");
    setSrc(undefined);
    const url = `/api/admin/voice-try?${new URLSearchParams({ source, model: m, speaker: sp.trim(), pace: String(p) })}`;
    const res = await fetch(url);
    if (!res.ok) return setStatus(`Couldn't make it: ${(await res.text()).slice(0, 200)}`);
    setSrc(URL.createObjectURL(await res.blob()));
    setStatus("");
  }

  return (
    <form action={save} className="form stack" style={{ gap: 12 }}>
      <input type="hidden" name="source" value={source} />
      <div className="grid-2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor={`m-${source}`}>Model</label>
          <select id={`m-${source}`} name="model" value={m} onChange={(e) => setM(e.target.value)}>
            <option value="bulbul:v3">Bulbul v3 (stable)</option>
            <option value="bulbul:v4-flash">Bulbul v4 Flash (newest)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`s-${source}`}>Voice</label>
          <input id={`s-${source}`} name="speaker" list={listId} value={sp} onChange={(e) => setSp(e.target.value.toLowerCase())} required />
          <datalist id={listId}>{speakers.map((x) => <option key={x} value={x} />)}</datalist>
        </div>
      </div>
      <div className="field">
        <label htmlFor={`p-${source}`}>Speed: {p.toFixed(2)}×</label>
        <input id={`p-${source}`} name="pace" type="range" min={0.7} max={1.4} step={0.05} value={p} onChange={(e) => setP(Number(e.target.value))} />
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost btn-sm" onClick={listen}>▶ Listen</button>
        <button type="submit" className="btn btn-primary btn-sm">Use this voice</button>
      </div>
      {status && <p className="fine" role="status">{status}</p>}
      {src && <audio src={src} controls autoPlay style={{ width: "100%" }} />}
    </form>
  );
}
