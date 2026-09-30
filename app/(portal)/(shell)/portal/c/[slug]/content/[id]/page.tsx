import type { Metadata } from "next";
import Link from "next/link";
import { requireClientAccess } from "@/lib/auth";
import { autoApproveAt, formatDate, formatLabel, formatTime, getItem, listEvents, stageOf } from "@/lib/pipeline";
import { redirect } from "next/navigation";
import { approveItem, commentOnItem, requestItemChanges } from "../../../../../../pipeline-actions";

export const metadata: Metadata = { title: "Content item", robots: { index: false } };

export default async function ClientItem({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ approved?: string; changes?: string; error?: string }> }) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const { user, client } = await requireClientAccess(slug);
  const item = await getItem(Number(id));
  if (!item || item.client_id !== client.id) redirect(`/portal/c/${slug}/content`);
  const events = await listEvents(item.id, false);
  const due = autoApproveAt(item);
  const showScript = item.review === "script" || Boolean(item.script_approved_at);
  const showVideo = item.review === "video" || Boolean(item.video_approved_at);

  return (
    <section className="wrap section-tight stack" style={{ gap: 22, maxWidth: 860 }}>
      <div className="stack" style={{ gap: 6 }}>
        <p className="eyebrow"><Link href={`/portal/c/${slug}/content`}>Your content plan</Link></p>
        <h1 className="portal-title">{item.title}</h1>
        <p className="muted">{[stageOf(item.stage).client, formatLabel(item.format), item.platform, item.language, item.publish_on && `Publishing ${formatDate(item.publish_on)}`].filter(Boolean).join(" · ")}</p>
      </div>

      {sp.approved && <p className="notice notice-inline" role="status">Thanks, approved. We&apos;ll take it from here.</p>}
      {sp.changes && <p className="notice notice-inline" role="status">Got it. We&apos;ll make the changes and send it back to you.</p>}
      {sp.error === "already" && <p className="notice notice-inline" role="status">This was already answered, so nothing changed.</p>}

      {item.review && (
        <div className="card form approve-box" id="respond">
          <h3>{item.review === "script" ? "Please approve the script" : "Please approve the final video"}</h3>
          <p className="muted">
            {item.review === "script" ? "Read the script below. Once you approve it we start production." : "Watch the video. Once you approve it we schedule it to publish."}
            {due && ` If we don't hear from you by ${formatTime(due.toISOString())}, we'll treat it as approved.`}
          </p>
          <form action={approveItem} className="btn-row">
            <input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={item.id} />
            <button className="btn btn-primary" type="submit">Approve {item.review}</button>
          </form>
          <form action={requestItemChanges} className="form">
            <input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={item.id} />
            <div className="field">
              <label htmlFor="comment">Or tell us what to change</label>
              {sp.error === "comment" && <p className="fine" role="alert">Write what you&apos;d like changed.</p>}
              <textarea id="comment" name="comment" rows={3} required placeholder="Make the hook shorter and mention free shipping." />
            </div>
            <div><button className="btn btn-ghost btn-sm" type="submit">Request changes</button></div>
          </form>
        </div>
      )}

      {showVideo && item.video_url && (
        <div className="card stack" style={{ gap: 8 }}>
          <h3>Video</h3>
          <a href={item.video_url} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-sm" style={{ justifySelf: "start" }}>Watch the video</a>
          {item.video_approved_at && <span className="fine">Approved {formatTime(item.video_approved_at)}</span>}
        </div>
      )}
      {item.published_url && (
        <p><a href={item.published_url} target="_blank" rel="noreferrer noopener">See it live</a></p>
      )}

      {showScript && (
        <div className="card stack" style={{ gap: 8 }}>
          <h3>Script</h3>
          {item.script_approved_at && <span className="fine">Approved {formatTime(item.script_approved_at)}</span>}
          <div className="script-text">{item.script}</div>
        </div>
      )}

      {item.brief && (
        <div className="card stack" style={{ gap: 8 }}>
          <h3>The idea</h3>
          <p className="brand-text">{item.brief}</p>
        </div>
      )}

      <div className="card form" id="history">
        <h3>History and messages</h3>
        <form action={commentOnItem} className="form">
          <input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={item.id} />
          <div className="field"><label htmlFor="body">Message your growth manager</label><textarea id="body" name="body" rows={2} /></div>
          <div><button className="btn btn-ghost btn-sm" type="submit">Send</button></div>
        </form>
        <ol className="history">
          {events.map((e) => (
            <li key={e.id}>
              <span className="fine">{formatTime(e.created_at)} · {e.actor === user.email ? "You" : e.actor}</span>
              <span className="brand-text">{e.body}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
