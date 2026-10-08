import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatTime } from "@/lib/pipeline";
import { listSampleRequests, SAMPLE_STATUSES } from "@/lib/video/requests";
import { updateSampleRequest } from "../../../video-actions";

export const metadata: Metadata = { title: "Sample requests", robots: { index: false } };

const labels: Record<string, string> = { new: "New", approved: "Approved, to make", declined: "Declined", sent: "Sample sent" };

export default async function AdminSamples() {
  await requireAdmin();
  const rows = await listSampleRequests();
  return (
    <section className="wrap section-tight stack" style={{ gap: 22 }}>
      <div>
        <p className="eyebrow">Admin · <Link href="/admin">Clients</Link></p>
        <h1 className="portal-title">Free sample requests</h1>
        <p className="muted">From the <Link href="/sample-video">sample video page</Link>. One per phone number. Nothing is made until you approve it.</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Received</th><th scope="col">Business</th><th scope="col">Contact</th><th scope="col">Wants</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatTime(r.created_at)}</td>
                <td className="topic">{r.business}{r.niche ? <span className="muted"> · {r.niche}</span> : null}</td>
                <td>{r.name}<br /><span className="muted">{r.email}<br />{r.phone}</span></td>
                <td>{r.language || "Any language"}{r.topic ? <><br /><span className="muted">{r.topic}</span></> : null}</td>
                <td>
                  <form action={updateSampleRequest} className="stack" style={{ gap: 6 }}>
                    <input type="hidden" name="id" value={r.id} />
                    <select name="status" defaultValue={r.status} aria-label={`Status for ${r.business}`}>
                      {SAMPLE_STATUSES.map((s) => <option key={s} value={s}>{labels[s]}</option>)}
                    </select>
                    <input name="note" defaultValue={r.note} placeholder="Note" aria-label="Note" />
                    <button className="btn btn-ghost btn-sm" type="submit">Save</button>
                  </form>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5}>No requests yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
