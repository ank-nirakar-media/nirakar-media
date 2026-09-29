import Link from "next/link";

export function Cta() {
  return (
    <section className="section-tight">
      <div className="wrap">
        <div className="cta">
          <p className="eyebrow">Start your engine</p>
          <h2>Turn your expertise into a repeatable content engine.</h2>
          <p>Start with a free content audit, or pick a plan and get your research and content plan within three working days.</p>
          <div className="btn-row">
            <Link href="/contact?plan=audit" className="btn btn-primary">Book a free content audit →</Link>
            <Link href="/pricing" className="btn btn-ghost">See plans</Link>
          </div>
          <p className="fine">₹0 setup · No long-term lock-in · Your channel and ad revenue stay 100% yours</p>
        </div>
      </div>
    </section>
  );
}
