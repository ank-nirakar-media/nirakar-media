"use client";

import { useEffect, useState } from "react";
import type { Publication } from "@/lib/publish";

type Accounts = { youtube?: string; instagram?: string };

// Admin > Exports: posts one finished MP4 to Nirakar Media's own YouTube and Instagram.
export function PublishBox({ exportId, defaultTitle, accounts, initial }: { exportId: number; defaultTitle: string; accounts: Accounts; initial: Publication[] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(initial);
  const [title, setTitle] = useState(defaultTitle);
  const [caption, setCaption] = useState("");
  const [platforms, setPlatforms] = useState<string[]>((["youtube", "instagram"] as const).filter((p) => accounts[p]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const waiting = rows.some((r) => r.status === "queued" || r.status === "publishing");

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/admin/exports/${exportId}/publish`, { cache: "no-store" }).catch(() => undefined);
      if (res?.ok) setRows((await res.json()) as Publication[]);
    }, 5000);
    return () => clearInterval(timer);
  }, [waiting, exportId]);

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/admin/exports/${exportId}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ platforms, title, caption }) });
      const data = (await res.json()) as { ids?: number[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      const fresh = await fetch(`/api/admin/exports/${exportId}/publish`, { cache: "no-store" });
      if (fresh.ok) setRows((await fresh.json()) as Publication[]);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const name = (p: string) => (p === "youtube" ? "YouTube" : "Instagram");
  const none = !accounts.youtube && !accounts.instagram;
  return (
    <div className="stack" style={{ gap: 6, marginTop: 8 }}>
      {rows.map((r) => (
        <span key={r.id} className="fine">
          {name(r.platform)}: {r.status === "done" ? (r.url ? <a href={r.url} target="_blank" rel="noreferrer">posted</a> : "posted") : r.status === "error" ? `failed. ${r.error}` : "posting…"}
        </span>
      ))}
      {!open ? (
        <button className="btn btn-ghost btn-sm" type="button" style={{ justifySelf: "start" }} disabled={none} title={none ? "Connect Nirakar Media's accounts first" : undefined} onClick={() => setOpen(true)}>
          Publish
        </button>
      ) : (
        <div className="form stack" style={{ gap: 8 }}>
          <label htmlFor={`t${exportId}`}>Title (YouTube, up to 100 characters)</label>
          <input id={`t${exportId}`} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
          <label htmlFor={`c${exportId}`}>Description and caption</label>
          <textarea id={`c${exportId}`} rows={4} value={caption} maxLength={2200} onChange={(e) => setCaption(e.target.value)} placeholder="What the video shows, a call to action and hashtags" />
          <div className="btn-row">
            {(["youtube", "instagram"] as const).map((p) => (
              <label key={p} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" disabled={!accounts[p]} checked={platforms.includes(p)} onChange={(e) => setPlatforms((cur) => (e.target.checked ? [...cur, p] : cur.filter((x) => x !== p)))} />
                {name(p)} {accounts[p] ? `(${accounts[p]})` : "(not connected)"}
              </label>
            ))}
          </div>
          <div className="btn-row">
            <button className="btn btn-sm" type="button" disabled={busy || !platforms.length || !title.trim()} onClick={submit}>{busy ? "Starting…" : "Post now"}</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setOpen(false)}>Cancel</button>
          </div>
          <p className="fine">Posts publicly straight away. YouTube treats vertical videos up to 3 minutes as Shorts.</p>
        </div>
      )}
      {error && <span className="notice notice-inline" role="alert">{error}</span>}
    </div>
  );
}
