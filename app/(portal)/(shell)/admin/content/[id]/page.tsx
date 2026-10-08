import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemFlags } from "@/components/portal/Pipeline";
import { requireAdmin } from "@/lib/auth";
import { autoApproveAt, formatTime, formats, getItem, listEvents, platforms, reviewLabel, stages } from "@/lib/pipeline";
import { aiConfigured } from "@/lib/ai/claude";
import { loadScenes } from "@/lib/ai/studio";
import { VideoPreview } from "@/components/VideoPreview";
import { loadBrand } from "@/lib/brand";
import { brandColors, planFromScenes } from "@/lib/video/build";
import { aiDraftScript } from "../../../../ai-actions";
import { addItemMessage, deleteItem, sendItemForReview, updateItem } from "../../../../pipeline-actions";

export const maxDuration = 120;

export const metadata: Metadata = { title: "Content item", robots: { index: false } };

export default async function AdminItem({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; sent?: string; error?: string; drafted?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const item = await getItem(Number(id));
  if (!item) notFound();
  const events = await listEvents(item.id, true);
  const due = autoApproveAt(item);
  const scenes = await loadScenes(item.id);
  const ai = aiConfigured();
  const preview = scenes.length && item.format !== "long" ? await previewPlan(item, scenes) : null;

  return (
    <section className="wrap section-tight stack" style={{ gap: 22, maxWidth: 900 }}>
      <div className="portal-head">
        <div>
          <p className="eyebrow"><Link href={`/admin/content?client=${item.client_slug}`}>Content pipeline</Link> · <Link href={`/admin/c/${item.client_slug}`}>{item.client_name}</Link></p>
          <h1 className="portal-title">{item.title}</h1>
          <div className="btn-row"><ItemFlags item={item} /></div>
        </div>
        <Link href={`/portal/c/${item.client_slug}/content/${item.id}`} className="btn btn-ghost btn-sm">See what the client sees</Link>
      </div>

      {sp.saved && <p className="notice notice-inline" role="status">Saved.</p>}
      {sp.sent && <p className="notice notice-inline" role="status">{reviewLabel(sp.sent)} sent to the client for approval. It approves itself automatically if they don&apos;t reply in 48 hours.</p>}
      {sp.drafted && <p className="notice notice-inline" role="status">AI draft saved. Read it, edit anything that&apos;s off, and fill any [placeholders] before you send it to the client.</p>}
      {sp.error && <p className="notice notice-inline" role="alert">{sp.error}</p>}
      {item.review && due && (
        <p className="notice notice-inline" role="status">Waiting for the client to approve the {item.review}. Auto-approves on {formatTime(due.toISOString())}.</p>
      )}
      {!item.review && item.changes_requested && (
        <div className="notice notice-inline" role="status"><b>The client asked for changes:</b> <span className="brand-text">{item.changes_requested}</span></div>
      )}

      <div className="card approval-steps">
        <p className="fine">Save your changes first. The client sees the saved script and video link.</p>
        <div>
          <b>Script</b>
          <span className="muted">{item.script_approved_at ? `Approved ${formatTime(item.script_approved_at)}` : item.review === "script" ? "Waiting on client" : "Not approved yet"}</span>
          <form action={sendItemForReview}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="kind" value="script" />
            <button className="btn btn-ghost btn-sm" type="submit" disabled={item.review === "script"}>{item.script_approved_at ? "Send again" : "Send script for approval"}</button>
          </form>
        </div>
        <div>
          <b>Final video</b>
          <span className="muted">{item.video_approved_at ? `Approved ${formatTime(item.video_approved_at)}` : item.review === "video" ? "Waiting on client" : "Not approved yet"}</span>
          <form action={sendItemForReview}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="kind" value="video" />
            <button className="btn btn-ghost btn-sm" type="submit" disabled={item.review === "video"}>{item.video_approved_at ? "Send again" : "Send video for approval"}</button>
          </form>
        </div>
      </div>

      <div className="card form studio-box">
        <h3>AI Studio</h3>
        {ai ? (
          <form action={aiDraftScript} className="form">
            <input type="hidden" name="id" value={item.id} />
            <p className="muted">
              {item.changes_requested && item.script
                ? "Redraft the script using the client's change request and the Brand Brain."
                : "Draft the script, scene plan and post caption from the brief and the client's Brand Brain."}{" "}
              It saves as a draft here. Nothing goes to the client until you send it.
            </p>
            <div className="btn-row">
              {item.script.trim() && <label className="check"><input type="checkbox" name="replace" /> Replace the current script (the old one is kept in history)</label>}
              <button className="btn btn-primary btn-sm" type="submit" disabled={item.review === "script"}>{item.script.trim() ? "Redraft with AI" : "Draft script with AI"}</button>
            </div>
            <p className="fine">Takes up to a minute. {item.ai_drafted_at && `Last AI draft ${formatTime(item.ai_drafted_at)}.`}</p>
          </form>
        ) : (
          <p className="muted">AI drafting isn&apos;t set up yet. Add ANTHROPIC_API_KEY in Vercel, then see <Link href="/admin/ai">Admin &gt; AI</Link>.</p>
        )}
      </div>

      <form action={updateItem} className="card form">
        <input type="hidden" name="id" value={item.id} />
        <div className="grid-2" style={{ gap: 14 }}>
          <div className="field"><label htmlFor="title">Title</label><input id="title" name="title" defaultValue={item.title} required /></div>
          <div className="field">
            <label htmlFor="stage">Stage</label>
            <select id="stage" name="stage" defaultValue={item.stage}>{stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
          </div>
          <div className="field">
            <label htmlFor="format">Format</label>
            <select id="format" name="format" defaultValue={item.format}>{formats.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
          </div>
          <div className="field">
            <label htmlFor="platform">Platform</label>
            <select id="platform" name="platform" defaultValue={item.platform}><option value="">Not decided</option>{platforms.map((p) => <option key={p}>{p}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="language">Language</label><input id="language" name="language" defaultValue={item.language} /></div>
          <div className="field"><label htmlFor="due_date">Internal due date</label><input id="due_date" name="due_date" type="date" defaultValue={item.due_date ?? ""} /></div>
          <div className="field"><label htmlFor="publish_on">Publish on</label><input id="publish_on" name="publish_on" type="date" defaultValue={item.publish_on ?? ""} /></div>
        </div>
        <div className="field"><label htmlFor="brief">Brief</label><textarea id="brief" name="brief" rows={3} defaultValue={item.brief} /></div>
        <div className="field" id="script">
          <label htmlFor="script-text">Script</label>
          <p className="fine">The client sees this once you send it for approval.</p>
          <textarea id="script-text" name="script" rows={12} defaultValue={item.script} />
        </div>
        {scenes.length > 0 && (
          <details className="scene-plan">
            <summary>Scene plan from the AI draft ({scenes.length} scenes, about {scenes.reduce((n, s) => n + s.seconds, 0)} seconds)</summary>
            <p className="fine">For the editor. It isn&apos;t updated when you edit the script.</p>
            <ol>
              {scenes.map((s, i) => (
                <li key={i}>
                  <span className="fine">{s.seconds}s · Visual: {s.visual}{s.on_screen_text && ` · On screen: "${s.on_screen_text}"`}</span>
                  <span className="brand-text">{s.voiceover}</span>
                </li>
              ))}
            </ol>
          </details>
        )}
        <div className="field">
          <label htmlFor="caption">Post caption and hashtags</label>
          <p className="fine">Used when the video is published.</p>
          <textarea id="caption" name="caption" rows={4} defaultValue={item.caption} />
        </div>
        <div className="grid-2" style={{ gap: 14 }}>
          <div className="field">
            <label htmlFor="video_url">Video link</label>
            <p className="fine">Google Drive or an unlisted YouTube link the client can open.</p>
            <input id="video_url" name="video_url" inputMode="url" defaultValue={item.video_url} placeholder="https://drive.google.com/..." />
          </div>
          <div className="field">
            <label htmlFor="published_url">Published link</label>
            <p className="fine">Where it went live.</p>
            <input id="published_url" name="published_url" inputMode="url" defaultValue={item.published_url} placeholder="https://youtube.com/shorts/..." />
          </div>
        </div>
        <div className="field">
          <label htmlFor="internal_notes">Internal notes</label>
          <p className="fine">Only you see these.</p>
          <textarea id="internal_notes" name="internal_notes" rows={3} defaultValue={item.internal_notes} />
        </div>
        <div className="btn-row"><button className="btn btn-primary btn-sm" type="submit">Save</button></div>
      </form>

      {preview && (
        <details className="card scene-plan" id="video-preview">
          <summary>Video preview from the scene plan (silent, brand colours from the Brand Brain)</summary>
          <p className="fine">Built by the video engine from the AI scene plan. Voice and stock footage are added when the video is rendered. Only you see this.</p>
          <div style={{ maxWidth: 320 }}><VideoPreview plan={preview} label={`Preview of ${item.title}`} /></div>
        </details>
      )}

      <div className="card form" id="history">
        <h3>History and messages</h3>
        <form action={addItemMessage} className="form">
          <input type="hidden" name="id" value={item.id} />
          <div className="field"><label htmlFor="body">Message to the client</label><textarea id="body" name="body" rows={2} /></div>
          <div className="btn-row">
            <label className="check"><input type="checkbox" name="internal" /> Internal note (client won&apos;t see it)</label>
            <button className="btn btn-ghost btn-sm" type="submit">Add</button>
          </div>
        </form>
        <ol className="history">
          {events.map((e) => (
            <li key={e.id} className={e.internal ? "is-internal" : ""}>
              <span className="fine">{formatTime(e.created_at)} · {e.actor}{e.internal ? " · internal" : ""}</span>
              <span className="brand-text">{e.body}</span>
            </li>
          ))}
        </ol>
      </div>

      <details className="danger-zone">
        <summary className="fine">Delete this item</summary>
        <form action={deleteItem} className="btn-row">
          <input type="hidden" name="id" value={item.id} />
          <span className="fine">This removes the item and its history for you and the client.</span>
          <button className="btn btn-ghost btn-sm" type="submit">Yes, delete it</button>
        </form>
      </details>
    </section>
  );
}

async function previewPlan(item: { id: number; client_id: number; client_name: string; language: string }, scenes: Awaited<ReturnType<typeof loadScenes>>) {
  const brand = await loadBrand(item.client_id, "");
  const colors = brandColors(String(brand.data.colors_fonts ?? ""));
  return planFromScenes({ scenes: scenes.map(({ voiceover, on_screen_text }) => ({ voiceover, on_screen_text })), brand: { name: item.client_name, ...colors }, language: item.language || "English", seed: item.id });
}
