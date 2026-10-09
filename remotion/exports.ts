// Props for MP4 exports of the website demos. The server only knows the voice URLs; the voice lengths are
// measured here, inside the render, and the plan is built the same way the website players build it.
import { planFrames, type VideoPlan } from "../lib/video/plan";
import { samplePlan, samples, type SampleClip } from "../lib/video/samples";
import { walkDurations, walkFrames } from "../lib/video/walkthrough";
import type { WalkProps } from "./Walkthrough";

// voiceSeconds is measured by the server (lib/video/mp3.ts); the in-render measurement is only a fallback.
export type ShortExportProps = { sample: string; voiceSrc?: string; voiceSeconds?: number; clips?: SampleClip[]; plan?: VideoPlan };
export type WalkExportProps = { voiceSrcs?: string[]; voiceSeconds?: number[]; clips?: SampleClip[]; walk?: WalkProps };
type Measure = (src: string) => Promise<number>;

async function length(src: string, known: number | undefined, measure: Measure) {
  const seconds = known && Number.isFinite(known) ? known : await measure(src);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Couldn't read the length of the voice file ${src}`);
  return seconds;
}

export async function shortExportMetadata(props: ShortExportProps, measure: Measure) {
  const s = samples.find((x) => x.id === props.sample) ?? samples[0];
  const take = props.voiceSrc ? { src: props.voiceSrc, seconds: await length(props.voiceSrc, props.voiceSeconds, measure) } : undefined;
  const plan = samplePlan(s, undefined, take, props.clips);
  return { durationInFrames: planFrames(plan), width: plan.width, height: plan.height, props: { ...props, plan } };
}

export async function walkExportMetadata(props: WalkExportProps, measure: Measure) {
  const seconds = props.voiceSrcs ? await Promise.all(props.voiceSrcs.map((src, i) => length(src, props.voiceSeconds?.[i], measure))) : undefined;
  const walk: WalkProps = { durations: walkDurations(seconds), audio: props.voiceSrcs, phonePlan: samplePlan(samples[0], undefined, undefined, props.clips) };
  return { durationInFrames: walkFrames(walk.durations), props: { ...props, walk } };
}
