// Stock footage for the example videos, from Pexels or Pixabay (whichever key is set; Pexels first).
// Pexels (https://www.pexels.com/api/documentation/, checked 2026-10-08): GET /v1/videos/search, header
//   "Authorization: <key>", 200 requests an hour, show a prominent link to Pexels and credit creators.
//   Its help centre said new key issuance was paused on 2026-10-08.
// Pixabay (https://pixabay.com/api/docs/, checked 2026-10-08): GET /api/videos/?key=&q=, 100 requests a
//   minute, results must be cached for 24 hours, videos may be embedded directly, show where they come from.

export const footageProvider = (): "pexels" | "pixabay" | null =>
  process.env.PEXELS_API_KEY ? "pexels" : process.env.PIXABAY_API_KEY ? "pixabay" : null;
export const footageConfigured = () => footageProvider() !== null;

export type ClipFile = { width: number; height: number; link: string; type: string };
export type Candidate = { id: number; duration: number; credit: string; pageUrl: string; source: "Pexels" | "Pixabay"; files: ClipFile[] };
export type Clip = { id: number; src: string; credit: string; pageUrl: string; source: "Pexels" | "Pixabay" };

// A vertical MP4 close to 720 px wide is sharp in a phone-sized player without a heavy download.
// Landscape files are allowed as a fallback (the player crops the centre), judged by their height.
export function pickFile(files: ClipFile[], allowLandscape = false, target = 720): ClipFile | undefined {
  const ok = files.filter((f) => f.type === "video/mp4" && f.link.startsWith("https://"));
  const portrait = ok.filter((f) => f.height > f.width && f.width >= 480 && f.width <= 1440);
  if (portrait.length) return portrait.sort((a, b) => Math.abs(a.width - target) - Math.abs(b.width - target))[0];
  if (!allowLandscape) return undefined;
  const wide = ok.filter((f) => f.height >= 540 && f.height <= 1440);
  return wide.sort((a, b) => Math.abs(a.height - 1080) - Math.abs(b.height - 1080))[0];
}

// Best clip for a scene: vertical if any result is, at least minSeconds long, not already used in this video.
export function pickClip(found: Candidate[], minSeconds: number, used: Set<number>): Clip | undefined {
  const fresh = found.filter((c) => !used.has(c.id) && c.duration >= minSeconds);
  for (const allowLandscape of [false, true]) {
    for (const c of fresh) {
      const f = pickFile(c.files, allowLandscape);
      if (f) return { id: c.id, src: f.link, credit: c.credit, pageUrl: c.pageUrl, source: c.source };
    }
  }
  return undefined;
}

export async function searchFootage(query: string): Promise<Candidate[]> {
  const provider = footageProvider();
  if (provider === "pexels") return searchPexels(query, process.env.PEXELS_API_KEY!);
  if (provider === "pixabay") return searchPixabay(query, process.env.PIXABAY_API_KEY!);
  throw new Error("No footage key: set PEXELS_API_KEY or PIXABAY_API_KEY");
}

type PexelsVideo = { id: number; url: string; duration: number; user?: { name: string }; video_files: { file_type: string; width: number; height: number; link: string }[] };

async function searchPexels(query: string, key: string): Promise<Candidate[]> {
  const url = `https://api.pexels.com/v1/videos/search?${new URLSearchParams({ query, orientation: "portrait", size: "medium", per_page: "15" })}`;
  const res = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const videos = ((await res.json()) as { videos?: PexelsVideo[] }).videos ?? [];
  return videos.map((v) => ({
    id: v.id, duration: v.duration, credit: v.user?.name ?? "Pexels", pageUrl: v.url, source: "Pexels",
    files: v.video_files.map((f) => ({ width: f.width, height: f.height, link: f.link, type: f.file_type })),
  }));
}

type PixabayHit = { id: number; pageURL: string; duration: number; user: string; videos: Record<string, { url: string; width: number; height: number }> };

async function searchPixabay(query: string, key: string): Promise<Candidate[]> {
  const url = `https://pixabay.com/api/videos/?${new URLSearchParams({ key, q: query.slice(0, 100), video_type: "film", safesearch: "true", per_page: "20" })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Pixabay ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const hits = ((await res.json()) as { hits?: PixabayHit[] }).hits ?? [];
  return hits.map((h) => ({
    id: h.id, duration: h.duration, credit: h.user || "Pixabay", pageUrl: h.pageURL, source: "Pixabay",
    // Pixabay files are MP4; an empty url means that size isn't available.
    files: Object.values(h.videos ?? {}).filter((v) => v?.url).map((v) => ({ width: v.width, height: v.height, link: v.url, type: "video/mp4" })),
  }));
}
