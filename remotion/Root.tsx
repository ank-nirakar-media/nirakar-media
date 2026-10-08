import { Composition } from "remotion";
import { FPS, planFrames, type VideoPlan } from "../lib/video/plan";
import { samplePlan } from "./sample";
import { Short } from "./Short";

// One composition, "Short". Its length and size come from the plan passed in as props.
export function Root() {
  return (
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
  );
}
