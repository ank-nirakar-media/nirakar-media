// MP4 exports of the website demos (Admin > Exports), rendered with Remotion on Vercel Sandbox and saved
// to a private Vercel Blob store. One row per export in video_exports; the admin page polls until the file
// is ready, then downloads it through a short-lived signed link.
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

// A connected Blob store gives the project BLOB_STORE_ID (signed in with Vercel's OIDC token); older
// stores give BLOB_READ_WRITE_TOKEN. Either works for the upload in finishExport.
export const renderConfigured = () => Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
// The sandbox renders to this file; this function then copies it to Blob.
const SANDBOX_FILE = "/tmp/video.mp4";
// Where @remotion/vercel puts the bundle inside the sandbox (relative to /vercel/sandbox).
const SANDBOX_BUNDLE_DIR = "remotion-bundle";
// The sandbox has no Blob credentials (OIDC only works inside our functions), so its own upload step is
// handed an empty token. It fails with exactly this message after the video is rendered, and we upload it.
const NO_TOKEN = "BLOB_READ_WRITE_TOKEN is not set.";
export const renderedNotUploaded = (message: string) => message.includes(NO_TOKEN);
export const exportPath = (source: string, id: number) => `exports/nirakar-${source}-${id}.mp4`;

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
  if (!renderConfigured()) return update(id, { status: "error", error: "No Blob store is connected. Connect one to the project in Vercel, then redeploy." });
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
    // @remotion/vercel 4.0.534 creates the bundle's subfolders (public/fonts) but not the bundle folder
    // itself, so the first mkDir fails on a fresh sandbox. Create it first.
    await sandbox.mkDir(SANDBOX_BUNDLE_DIR).catch(() => undefined);
    await addBundleToSandbox({ sandbox, bundleDir: path.join(process.cwd(), BUNDLE_DIR) });
    const { sandboxId, cmdId } = await renderMediaOnVercel({
      sandbox,
      compositionId: input.compositionId,
      inputProps: input.inputProps,
      codec: "h264",
      outputFile: SANDBOX_FILE,
      detached: true,
      vercelBlob: { blobToken: "", access: "private" },
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
    const rendered = p.stage === "done" || (p.stage === "error" && renderedNotUploaded(p.message));
    if (rendered) await finishExport(row);
    else if (p.stage === "error") await update(id, { status: "error", error: p.message.slice(-500) });
    else if (p.stage === "expired") await update(id, { status: "error", error: "The render sandbox expired before the video finished." });
    else await update(id, { progress: Math.round((0.2 + 0.75 * p.overallProgress) * 100) / 100 });
    if (rendered || p.stage === "error" || p.stage === "expired") await stopSandbox(row.sandbox_id);
  } catch (err) {
    console.error("Export progress failed", id, (err as Error).message);
  }
  return getExport(id);
}

// Copies the finished video out of the sandbox into the private Blob store.
async function finishExport(row: VideoExport) {
  const { Sandbox } = await import("@vercel/sandbox");
  const { put } = await import("@vercel/blob");
  const sandbox = await Sandbox.get({ sandboxId: row.sandbox_id! });
  const file = await sandbox.readFileToBuffer({ path: SANDBOX_FILE });
  if (!file?.length) return update(row.id, { status: "error", error: "The render finished but the video file was missing." });
  const blob = await put(exportPath(row.source, row.id), file, { access: "private", contentType: "video/mp4", allowOverwrite: true });
  await update(row.id, { status: "done", progress: 1, url: blob.pathname, size_bytes: file.length });
}

// A download link for a finished export, valid for an hour. The store is private, so links expire.
export async function downloadUrl(pathname: string): Promise<string | undefined> {
  try {
    const { issueSignedToken, presignUrl } = await import("@vercel/blob");
    const validUntil = Date.now() + 60 * 60 * 1000;
    const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
    return (await presignUrl(token, { operation: "get", pathname, access: "private", validUntil })).presignedUrl;
  } catch (err) {
    console.error("Export link failed", pathname, (err as Error).message);
    return undefined;
  }
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
