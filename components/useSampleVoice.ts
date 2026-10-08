"use client";

import { useEffect, useState } from "react";
import { sampleVoiceUrl, type Sample, type VoiceTrack } from "@/lib/video/samples";

// Loads the voice for each scene of an example video and reads its length, so scenes and captions
// match the real speech. Until every file is in (or if voice isn't set up), the preview stays silent.
export function useSampleVoice(sample: Sample, enabled: boolean): { track?: VoiceTrack; state: "off" | "loading" | "ready" | "failed" } {
  const [result, setResult] = useState<{ id: string; track?: VoiceTrack; failed?: boolean }>();

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    Promise.all(sample.scenes.map((_, i) => duration(sampleVoiceUrl(sample, i))))
      .then((track) => live && setResult({ id: sample.id, track }))
      .catch(() => live && setResult({ id: sample.id, failed: true }));
    return () => { live = false; };
  }, [sample, enabled]);

  if (!enabled) return { state: "off" };
  if (result?.id !== sample.id) return { state: "loading" };
  return result.track ? { track: result.track, state: "ready" } : { state: "failed" };
}

function duration(src: string): Promise<{ src: string; seconds: number }> {
  return new Promise((resolve, reject) => {
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => (Number.isFinite(a.duration) && a.duration > 0 ? resolve({ src, seconds: a.duration }) : reject(new Error("no duration")));
    a.onerror = () => reject(new Error("voice failed to load"));
    a.src = src;
  });
}
