"use client";

import { useMemo } from "react";
import { samplePlan, samples } from "@/lib/video/samples";
import { useSampleClips, useSampleVoice } from "./useSampleVoice";
import { VideoPreview } from "./VideoPreview";

// One example video with its voice and footage, for the gallery and the home page.
export function SamplePlayer({ id, voice, footage, label }: { id: string; voice: boolean; footage: boolean; label: string }) {
  const sample = samples.find((s) => s.id === id) ?? samples[0];
  const { track } = useSampleVoice(sample, voice);
  const clips = useSampleClips(sample, footage);
  const plan = useMemo(() => samplePlan(sample, undefined, track, clips), [sample, track, clips]);
  return (
    <>
      <VideoPreview key={`${track ? "v" : "s"}${clips ? "f" : ""}`} plan={plan} label={label} />
      {clips && <Credits clips={clips} />}
    </>
  );
}

export function Credits({ clips }: { clips: ({ credit: string; pageUrl: string } | null)[] }) {
  const people = [...new Map(clips.filter(Boolean).map((c) => [c!.credit, c!])).values()];
  return (
    <p className="fine video-credit">
      Footage: {people.map((c, i) => <span key={c.pageUrl}>{i ? ", " : ""}<a href={c.pageUrl} target="_blank" rel="noopener noreferrer">{c.credit}</a></span>)} on{" "}
      <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>
    </p>
  );
}
