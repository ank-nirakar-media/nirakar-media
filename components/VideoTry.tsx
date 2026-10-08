"use client";

import { useMemo, useState } from "react";
import { safeColor } from "@/lib/video/build";
import { samplePlan, samples } from "@/lib/video/samples";
import { Credits } from "./SamplePlayer";
import { useSampleClips, useSampleVoice } from "./useSampleVoice";
import { VideoPreview } from "./VideoPreview";

// "Try it with your business": swaps the visitor's name, handle and colour into an example video, live,
// in their browser. Nothing is sent to us and nothing is generated on a server.
export function VideoTry({ voice, footage }: { voice: boolean; footage: boolean }) {
  const [sampleId, setSampleId] = useState(samples[0].id);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [color, setColor] = useState("#8B5CF6");
  const sample = samples.find((s) => s.id === sampleId) ?? samples[0];
  const { track, state } = useSampleVoice(sample, voice);
  const clips = useSampleClips(sample, footage);

  const plan = useMemo(() => {
    const primary = safeColor(color, sample.brand.primary);
    const brand = {
      name: name.trim().slice(0, 32) || sample.brand.name,
      handle: handle.trim() ? "@" + handle.trim().replace(/^@+/, "").slice(0, 30) : sample.brand.handle,
      primary,
      accent: sample.brand.accent,
    };
    return samplePlan(sample, brand, track, clips);
  }, [sample, name, handle, color, track, clips]);

  return (
    <div className="video-try">
      <div className="card form video-try-form">
        <div className="field">
          <label htmlFor="vt-sample">Example</label>
          <select id="vt-sample" value={sampleId} onChange={(e) => setSampleId(e.target.value)}>
            {samples.map((s) => <option key={s.id} value={s.id}>{s.niche} ({s.language})</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="vt-name">Your business name</label>
          <input id="vt-name" value={name} maxLength={32} placeholder={sample.brand.name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="vt-handle">Instagram or YouTube handle</label>
          <input id="vt-handle" value={handle} maxLength={31} placeholder={sample.brand.handle} onChange={(e) => setHandle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="vt-color">Brand colour</label>
          <input id="vt-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <p className="fine">
          {state === "ready" || state === "loading"
            ? "Press play to hear it. This preview runs in your browser, so you see your changes straight away."
            : "This preview runs in your browser and is silent. Finished videos have an AI voice in your language, stock footage that fits your business, and music."}
        </p>
      </div>
      <div>
        <VideoPreview key={`${sample.id}-${track ? "v" : "s"}${clips ? "f" : ""}`} plan={plan} label={`Example video for ${plan.brand.name}`} />
        {clips && <Credits clips={clips} />}
      </div>
    </div>
  );
}
