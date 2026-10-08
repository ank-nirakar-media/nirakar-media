"use client";

import { useMemo } from "react";
import { samplePlan, samples, type SampleClip } from "@/lib/video/samples";
import { useSampleClips, useSampleVoice } from "./useSampleVoice";
import { VideoPreview } from "./VideoPreview";

// One example video with its voice and footage, for the gallery and the home page.
export function SamplePlayer({ id, voice, footage, label }: { id: string; voice: string | null; footage: boolean; label: string }) {
  const sample = samples.find((s) => s.id === id) ?? samples[0];
  const { take } = useSampleVoice(sample, voice);
  const clips = useSampleClips(sample, footage);
  const plan = useMemo(() => samplePlan(sample, undefined, take, clips), [sample, take, clips]);
  return (
    <>
      <VideoPreview key={`${take ? "v" : "s"}${clips ? "f" : ""}`} plan={plan} label={label} />
      {clips && <Credits clips={clips} />}
    </>
  );
}

const sites = { Pexels: "https://www.pexels.com", Pixabay: "https://pixabay.com" };

export function Credits({ clips }: { clips: SampleClip[] }) {
  const people = [...new Map(clips.filter((c): c is NonNullable<SampleClip> => Boolean(c)).map((c) => [c.credit, c])).values()];
  const source = people[0]?.source ?? "Pexels";
  return (
    <p className="fine video-credit">
      Footage: {people.map((c, i) => <span key={c.pageUrl}>{i ? ", " : ""}<a href={c.pageUrl} target="_blank" rel="noopener noreferrer">{c.credit}</a></span>)} on{" "}
      <a href={sites[source]} target="_blank" rel="noopener noreferrer">{source}</a>
    </p>
  );
}
