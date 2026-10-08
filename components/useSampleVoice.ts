"use client";

import { useEffect, useState } from "react";
import type { Sample, SampleClip, VoiceTrack } from "@/lib/video/samples";
import { voiceUrl } from "@/lib/video/voices";

// Loads the voice for each scene of an example video and reads its length, so scenes and captions
// match the real speech. Until every file is in (or if voice isn't set up), the preview stays silent.
export function useSampleVoice(sample: Pick<Sample, "id" | "scenes">, enabled: boolean): { track?: VoiceTrack; state: "off" | "loading" | "ready" | "failed" } {
  return useVoice(sample.id, sample.scenes.length, enabled);
}

// Same, for any fixed voice source (an example video or "walkthrough") with n lines.
export function useVoice(source: string, n: number, enabled: boolean): { track?: VoiceTrack; state: "off" | "loading" | "ready" | "failed" } {
  const [result, setResult] = useState<{ id: string; track?: VoiceTrack; failed?: boolean }>();

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    Promise.all(Array.from({ length: n }, (_, i) => duration(voiceUrl(source, i))))
      .then((track) => live && setResult({ id: source, track }))
      .catch(() => live && setResult({ id: source, failed: true }));
    return () => { live = false; };
  }, [source, n, enabled]);

  if (!enabled) return { state: "off" };
  if (result?.id !== source) return { state: "loading" };
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

// Background clips for an example video. Null entries (or no footage set up) keep the brand gradient.
export function useSampleClips(sample: Sample, enabled: boolean): SampleClip[] | undefined {
  const [result, setResult] = useState<{ id: string; clips: SampleClip[] }>();
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    fetch(`/api/sample-media/${sample.id}`)
      .then((r) => (r.ok ? r.json() : { clips: [] }))
      .then((d: { clips?: SampleClip[] }) => live && setResult({ id: sample.id, clips: d.clips ?? [] }))
      .catch(() => live && setResult({ id: sample.id, clips: [] }));
    return () => { live = false; };
  }, [sample, enabled]);
  return result?.id === sample.id && result.clips.length ? result.clips : undefined;
}
