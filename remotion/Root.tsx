import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { Composition } from "remotion";
import { FPS, planFrames, type VideoPlan } from "../lib/video/plan";
import { walkDurations } from "../lib/video/walkthrough";
import { shortExportMetadata, walkExportMetadata, type ShortExportProps, type WalkExportProps } from "./exports";
import { samplePlan } from "./sample";
import { Short } from "./Short";
import { Walkthrough, walkFrames, type WalkProps } from "./Walkthrough";

// "Short": one vertical video, length and size from the plan passed in as props.
// "Walkthrough": the narrated product walkthrough for the website, 16:9.
// "ShortExport" / "WalkthroughExport": the same demos as MP4 files, built from voice URLs (Admin > Exports).
export function Root() {
  const walk: WalkProps = { durations: walkDurations(), phonePlan: samplePlan };
  return (
    <>
      <Composition
        id="Short"
        component={Short}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={planFrames(samplePlan)}
        defaultProps={{ plan: samplePlan }}
        calculateMetadata={({ props }: { props: { plan: VideoPlan } }) => ({
          durationInFrames: planFrames(props.plan),
          width: props.plan.width,
          height: props.plan.height,
        })}
      />
      <Composition
        id="Walkthrough"
        component={Walkthrough}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={walkFrames(walk.durations)}
        defaultProps={walk}
        calculateMetadata={({ props }: { props: WalkProps }) => ({ durationInFrames: walkFrames(props.durations) })}
      />
      <Composition
        id="ShortExport"
        component={({ plan }: ShortExportProps) => <Short plan={plan ?? samplePlan} />}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={planFrames(samplePlan)}
        defaultProps={{ sample: "dental" } as ShortExportProps}
        calculateMetadata={({ props }: { props: ShortExportProps }) => shortExportMetadata(props, getAudioDurationInSeconds)}
      />
      <Composition
        id="WalkthroughExport"
        component={({ walk: w }: WalkExportProps) => <Walkthrough {...(w ?? walk)} />}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={walkFrames(walk.durations)}
        defaultProps={{} as WalkExportProps}
        calculateMetadata={({ props }: { props: WalkExportProps }) => walkExportMetadata(props, getAudioDurationInSeconds)}
      />
    </>
  );
}
