"use client";

import { Player } from "@remotion/player";
import { planFrames, type VideoPlan } from "@/lib/video/plan";
import { Short } from "@/remotion/Short";

// Plays a VideoPlan in the browser with the same composition the renderer uses, so what you see here
// is what the MP4 will look like. Previews have no voice until the plan carries audio.
export function VideoPreview({ plan, autoPlay = false, label }: { plan: VideoPlan; autoPlay?: boolean; label: string }) {
  return (
    <div className="video-frame" aria-label={label}>
      <Player
        component={Short}
        inputProps={{ plan }}
        durationInFrames={planFrames(plan)}
        compositionWidth={plan.width}
        compositionHeight={plan.height}
        fps={plan.fps}
        controls
        loop
        autoPlay={autoPlay}
        initialFrame={autoPlay ? 0 : Math.min(45, planFrames(plan) - 1)} // paused players open on a frame with text, not the fade-in
        initiallyMuted
        acknowledgeRemotionLicense
        style={{ width: "100%", aspectRatio: `${plan.width} / ${plan.height}` }}
      />
    </div>
  );
}
