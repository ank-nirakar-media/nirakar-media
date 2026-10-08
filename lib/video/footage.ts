// Stock footage from Pexels (https://www.pexels.com/api/documentation/, checked 2026-10-08):
// GET https://api.pexels.com/v1/videos/search?query=&orientation=portrait, header "Authorization: <key>",
// 200 requests an hour. Pexels asks for a prominent link to Pexels and credit to the creator where possible.

export const footageConfigured = () => Boolean(process.env.PEXELS_API_KEY);

export type Clip = { src: string; width: number; height: number; duration: number; credit: string; pageUrl: string };

type PexelsFile = { quality: string | null; file_type: string; width: number; height: number; link: string };
type PexelsVideo = { id: number; url: string; duration: number; width: number; height: number; user: { name: string }; video_files: PexelsFile[] };

// Picks a vertical MP4 close to 720 px wide: sharp in a phone-sized player without a heavy download.
export function pickFile(files: PexelsFile[], target = 720): PexelsFile | undefined {
  return files
    .filter((f) => f.file_type === "video/mp4" && f.height > f.width && f.width >= 480 && f.width <= 1440 && f.link.startsWith("https://"))
    .sort((a, b) => Math.abs(a.width - target) - Math.abs(b.width - target))[0];
}

// Best clip for a search phrase: portrait, at least minSeconds long, not already used in this video.
export function pickClip(videos: PexelsVideo[], minSeconds: number, used: Set<number>): (Clip & { id: number }) | undefined {
  for (const v of videos) {
    if (used.has(v.id) || v.duration < minSeconds || v.height <= v.width) continue;
    const f = pickFile(v.video_files);
    if (f) return { id: v.id, src: f.link, width: f.width, height: f.height, duration: v.duration, credit: v.user?.name ?? "Pexels", pageUrl: v.url };
  }
  return undefined;
}

export async function searchVideos(query: string): Promise<PexelsVideo[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY is not set");
  const url = `https://api.pexels.com/v1/videos/search?${new URLSearchParams({ query, orientation: "portrait", size: "medium", per_page: "15" })}`;
  const res = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { videos?: PexelsVideo[] }).videos ?? [];
}
