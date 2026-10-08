"use client";

import { useMemo } from "react";
import { samplePlan, samples } from "@/lib/video/samples";
import { useSampleVoice } from "./useSampleVoice";
import { VideoPreview } from "./VideoPreview";

// One example video with its voice, for the gallery and the home page.
export function SamplePlayer({ id, voice, label }: { id: string; voice: boolean; label: string }) {
  const sample = samples.find((s) => s.id === id) ?? samples[0];
  const { track } = useSampleVoice(sample, voice);
  const plan = useMemo(() => samplePlan(sample, undefined, track), [sample, track]);
  return <VideoPreview key={track ? "voiced" : "silent"} plan={plan} label={label} />;
}
