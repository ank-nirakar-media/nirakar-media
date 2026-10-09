// Background clips for one example video, chosen from Pexels or Pixabay by each scene's fixed search phrase.
// Used by /api/sample-media (website players) and by MP4 exports.
import { pickClip, searchFootage } from "./footage";
import { estimateSeconds } from "./plan";
import type { Sample, SampleClip } from "./samples";

export async function findSampleClips(s: Sample): Promise<SampleClip[]> {
  const used = new Set<number>();
  const clips: SampleClip[] = [];
  for (const scene of s.scenes) {
    const clip = pickClip(await searchFootage(scene.footage), estimateSeconds(scene.voiceover) + 1, used);
    if (clip) used.add(clip.id);
    clips.push(clip ? { src: clip.src, credit: clip.credit, pageUrl: clip.pageUrl, source: clip.source } : null);
  }
  return clips;
}
