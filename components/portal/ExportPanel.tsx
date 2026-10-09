"use client";

import { useEffect, useState } from "react";
import type { VideoExport } from "@/lib/video/exports";

// Admin > Exports: start an MP4 render and watch it until the download link is ready.
export function ExportPanel({ sources, initial, disabled }: { sources: { id: string; label: string }[]; initial: VideoExport[]; disabled: boolean }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const waiting = rows.filter((r) => r.status === "starting" || r.status === "rendering").map((r) => r.id).join(",");

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(async () => {
      const fresh = await Promise.all(
        waiting.split(",").map((id) => fetch(`/api/admin/exports/${id}`, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<VideoExport>) : undefined)).catch(() => undefined)),
      );
      setRows((cur) => cur.map((r) => fresh.find((f) => f?.id === r.id) ?? r));
    }, 5000);
    return () => clearInterval(timer);
  }, [waiting]);

  async function start(source: string) {
    setBusy(source);
    setError(undefined);
    try {
      const res = await fetch("/api/admin/exports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source }) });
      const data = (await res.json()) as { id?: number; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? `Error ${res.status}`);
      const row: VideoExport = { id: data.id, source, status: "starting", progress: 0, sandbox_id: null, cmd_id: null, url: null, size_bytes: null, error: null, created_at: new Date().toISOString() };
      setRows((cur) => [row, ...cur]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  const label = (id: string) => sources.find((s) => s.id === id)?.label ?? id;
  return (
    <>
      <div className="card stack" style={{ gap: 10 }}>
        {sources.map((s) => (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>{s.label}</span>
            <button className="btn btn-sm" type="button" disabled={disabled || busy !== undefined} onClick={() => start(s.id)}>
              {busy === s.id ? "Starting…" : "Make MP4"}
            </button>
          </div>
        ))}
        {error && <p className="notice notice-inline" role="alert">{error}</p>}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Video</th><th scope="col">Started</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{label(r.source)}</td>
                <td>{new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td aria-live="polite">
                  {r.status === "done" && r.url ? (
                    <a className="btn btn-sm" href={r.url} download target="_blank" rel="noreferrer">Download MP4{r.size_bytes ? ` (${(r.size_bytes / 1e6).toFixed(1)} MB)` : ""}</a>
                  ) : r.status === "error" ? (
                    <span className="muted">Failed: {r.error}</span>
                  ) : (
                    <span>{r.status === "starting" ? "Setting up the renderer" : "Rendering"} · {Math.round(r.progress * 100)}%</span>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={3}>No exports yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
