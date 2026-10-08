import { samplePlan as fromSample, samples } from "../lib/video/samples";

// The default plan for Remotion Studio and render tests: the dental example. No audio or stock clips, so it renders offline.
export const samplePlan = fromSample(samples[0]);
