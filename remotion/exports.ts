// Props for MP4 exports of the website demos. The server only knows the voice URLs; the voice lengths are
// measured here, inside the render, and the plan is built the same way the website players build it.
import { planFrames, type VideoPlan } from "../lib/video/plan";
import { samplePlan, samples, type SampleClip } from "../lib/video/samples";
import { walkDurations, walkFrames } from "../lib/video/walkthrough";
import type { WalkProps } from "./Walkthrough";

export type ShortExportProps = { sample: string; voiceSrc?: string; clips?: SampleClip[]; plan?: VideoPlan };
export type WalkExportProps = { voiceSrcs?: string[]; clips?: SampleClip[]; walk?: WalkProps };
type Measure = (src: string) => Promise<number>;

export async function shortExportMetadata(props: ShortExportProps, measure: Measure) {
  const s = samples.find((x) => x.id === props.sample) ?? samples[0];
  const take = props.voiceSrc ? { src: props.voiceSrc, seconds: await measure(props.voiceSrc) } : undefined;
  const plan = samplePlan(s, undefined, take, props.clips);
  return { durationInFrames: planFrames(plan), width: plan.width, height: plan.height, props: { ...props, plan } };
}

export async function walkExportMetadata(props: WalkExportProps, measure: Measure) {
  const seconds = props.voiceSrcs ? await Promise.all(props.voiceSrcs.map(measure)) : undefined;
  const walk: WalkProps = { durations: walkDurations(seconds), audio: props.voiceSrcs, phonePlan: samplePlan(samples[0], undefined, undefined, props.clips) };
  return { durationInFrames: walkFrames(walk.durations), props: { ...props, walk } };
}
