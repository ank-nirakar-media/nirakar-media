// MP4 exports of the website demos (Admin > Exports), rendered with Remotion on Vercel Sandbox and saved
// to Vercel Blob. One row per export in video_exports; the admin page polls until the file is ready.
import path from "node:path";
import { query } from "../db";
import { footageConfigured } from "./footage";
import { findSampleClips } from "./sample-clips";
import { samples, type SampleClip } from "./samples";
import { voiceConfigured } from "./voice";
import { loadVoiceSettings, settingsKey } from "./voice-settings";
import { voiceUrl } from "./voices";
import { walkScenes } from "./walkthrough";

export const EXPORT_SOURCES = [
  { id: "walkthrough", label: "Walkthrough (16:9, narrated)" },
  ...samples.map((s) => ({ id: s.id, label: `${s.niche} Short (9:16, ${s.language})` })),
];

export type ExportStatus = "starting" | "rendering" | "done" | "error";
export type VideoExport = {
  id: number;
  source: string;
  status: ExportStatus;
  progress: number;
  sandbox_id: string | null;
  cmd_id: string | null;
  url: string | null;
  size_bytes: number | null;
  error: string | null;
  created_at: string;
};

// Bundled at build time by scripts/bundle-remotion.ts and shipped with the export route.
export const BUNDLE_DIR = ".remotion";
// A render that hasn't started after this long is reported as failed instead of spinning forever.
const START_LIMIT_MS = 15 * 60 * 1000;

export const renderConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// What to render for one source: composition id and props. Voice and footage are URLs the render fetches.
export function exportInput(source: string, site: string, voiceKey: string | null, clips?: SampleClip[]) {
  if (source === "walkthrough") {
    const voiceSrcs = voiceKey ? walkScenes.map((_, i) => site + voiceUrl("walkthrough", i, voiceKey)) : undefined;
    return { compositionId: "WalkthroughExport", inputProps: { voiceSrcs, clips } };
  }
  if (!samples.some((s) => s.id === source)) return undefined;
  const voiceSrc = voiceKey ? site + voiceUrl(source, "full", voiceKey) : undefined;
  return { compositionId: "ShortExport", inputProps: { sample: source, voiceSrc, clips } };
}

export async function createExport(source: string, by: string): Promise<number | undefined> {
  if (!EXPORT_SOURCES.some((s) => s.id === source)) return undefined;
  const [row] = await query<{ id: number }>("INSERT INTO video_exports (source, created_by) VALUES ($1, $2) RETURNING id", [source, by]);
  return row.id;
}

export async function getExport(id: number): Promise<VideoExport | undefined> {
  const [row] = await query<VideoExport>("SELECT * FROM video_exports WHERE id = $1", [id]);
  return row ? normalize(row) : undefined;
}

export async function listExports(limit = 20): Promise<VideoExport[]> {
  const rows = await query<VideoExport>("SELECT * FROM video_exports ORDER BY id DESC LIMIT $1", [limit]);
  return rows.map(normalize);
}

async function update(id: number, fields: Partial<Pick<VideoExport, "status" | "progress" | "sandbox_id" | "cmd_id" | "url" | "size_bytes" | "error">>) {
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (!keys.length) return;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  await query(`UPDATE video_exports SET ${sets}, updated_at = now() WHERE id = $1`, [id, ...keys.map((k) => fields[k])]);
}

// Starts the render: a fresh sandbox, the bundle, then a detached render that uploads to Blob when done.
// Takes a few minutes (the sandbox installs Chrome), so the route calling it allows a long run.
export async function startExport(id: number, site: string): Promise<void> {
  const row = await getExport(id);
  if (!row) return;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return update(id, { status: "error", error: "BLOB_READ_WRITE_TOKEN is not set. Connect a Blob store to the project in Vercel, then redeploy." });
  try {
    const voiceKey = voiceConfigured() ? settingsKey(await loadVoiceSettings()) : null;
    const sample = samples.find((s) => s.id === (row.source === "walkthrough" ? "dental" : row.source))!;
    const clips = footageConfigured() ? await findSampleClips(sample).catch(() => undefined) : undefined;
    const input = exportInput(row.source, site, voiceKey, clips);
    if (!input) return update(id, { status: "error", error: "Unknown video" });

    const { addBundleToSandbox, createSandbox, renderMediaOnVercel } = await import("@remotion/vercel");
    const sandbox = await createSandbox({
      onProgress: async ({ progress }) => update(id, { progress: Math.round(progress * 20) / 100 }),
    });
    await addBundleToSandbox({ sandbox, bundleDir: path.join(process.cwd(), BUNDLE_DIR) });
    const { sandboxId, cmdId } = await renderMediaOnVercel({
      sandbox,
      compositionId: input.compositionId,
      inputProps: input.inputProps,
      codec: "h264",
      detached: true,
      vercelBlob: { blobToken, access: "public", blobPath: `exports/nirakar-${row.source}-${id}.mp4` },
    });
    await update(id, { status: "rendering", sandbox_id: sandboxId, cmd_id: cmdId, progress: 0.2 });
  } catch (err) {
    console.error("Export failed to start", id, err);
    await update(id, { status: "error", error: `Couldn't start the render: ${(err as Error).message}`.slice(0, 500) });
  }
}

// Brings one export up to date from the sandbox. Called by the admin page while it waits.
export async function refreshExport(id: number): Promise<VideoExport | undefined> {
  const row = await getExport(id);
  if (!row) return undefined;
  if (row.status === "starting" && Date.now() - new Date(row.created_at).getTime() > START_LIMIT_MS) {
    await update(id, { status: "error", error: "The render didn't start. Check the function logs in Vercel." });
    return getExport(id);
  }
  if (row.status !== "rendering" || !row.sandbox_id || !row.cmd_id) return row;
  try {
    const { getRenderProgress } = await import("@remotion/vercel");
    const p = await getRenderProgress({ sandboxId: row.sandbox_id, cmdId: row.cmd_id });
    if (p.stage === "done") await update(id, { status: "done", progress: 1, url: p.url, size_bytes: p.size });
    else if (p.stage === "error") await update(id, { status: "error", error: p.message.slice(0, 500) });
    else if (p.stage === "expired") await update(id, { status: "error", error: "The render sandbox expired before the video finished." });
    else await update(id, { progress: Math.round((0.2 + 0.8 * p.overallProgress) * 100) / 100 });
    if (p.stage === "done" || p.stage === "error" || p.stage === "expired") await stopSandbox(row.sandbox_id);
  } catch (err) {
    console.error("Export progress failed", id, (err as Error).message);
  }
  return getExport(id);
}

async function stopSandbox(sandboxId: string) {
  try {
    const { Sandbox } = await import("@vercel/sandbox");
    await (await Sandbox.get({ sandboxId })).stop();
  } catch {
    // already stopped
  }
}

function normalize(r: VideoExport): VideoExport {
  return { ...r, progress: Number(r.progress), size_bytes: r.size_bytes === null ? null : Number(r.size_bytes), created_at: new Date(r.created_at).toISOString() };
}
