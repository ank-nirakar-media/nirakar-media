"use client";

import { Player } from "@remotion/player";
import { useMemo } from "react";
import { walkDurations, walkScenes } from "@/lib/video/walkthrough";
import { samplePlan, samples } from "@/lib/video/samples";
import { Walkthrough, walkFrames, type WalkProps } from "@/remotion/Walkthrough";
import { useSampleClips, useVoice } from "./useSampleVoice";

// The narrated product walkthrough, played live in the browser. The phone inside it shows the dental
// example with its footage; its own voice stays off so it doesn't talk over the narrator.
export function WalkthroughPlayer({ voice, footage }: { voice: string | null; footage: boolean }) {
  const { track } = useVoice("walkthrough", walkScenes.length, voice);
  const clips = useSampleClips(samples[0], footage);
  const props: WalkProps = useMemo(
    () => ({
      durations: walkDurations(track?.map((t) => t.seconds)),
      audio: track?.map((t) => t.src),
      phonePlan: samplePlan(samples[0], undefined, undefined, clips),
    }),
    [track, clips],
  );
  return (
    <div className="video-frame video-wide" aria-label="How Nirakar Media makes, publishes and tracks a video">
      <Player
        key={`${track ? "v" : "s"}${clips ? "f" : ""}`}
        component={Walkthrough}
        inputProps={props}
        durationInFrames={walkFrames(props.durations)}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        controls
        allowFullscreen
        initialFrame={45}
        acknowledgeRemotionLicense
        style={{ width: "100%", aspectRatio: "16 / 9" }}
      />
    </div>
  );
}
