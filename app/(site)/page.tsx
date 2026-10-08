import Link from "next/link";
import { Cta } from "@/components/Cta";
import { Plans } from "@/components/Plans";
import { offerForDisplay } from "@/lib/offer";
import { formatInr, plans, priceInr } from "@/lib/plans";
import { HumanAi } from "@/components/HumanAi";
import { Languages } from "@/components/Languages";
import { dashboardMetrics, faqs, highlights, stageCount, verticals, workflow } from "@/lib/content";
import { HeroDashboard } from "@/components/HeroDashboard";
import { ServiceIcon } from "@/components/ServiceIcon";
import { WalkthroughPlayer } from "@/components/WalkthroughPlayer";
import { footageConfigured } from "@/lib/video/footage";
import { voiceConfigured } from "@/lib/video/voice";

// Re-checked every minute so the founding-offer seat count stays current.
export const revalidate = 60;

export default async function Home() {
  const offer = await offerForDisplay();
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">The content engine</p>
            <h1>
              You are not buying videos.
              <span className="line2 grad-text">You are buying the whole operation.</span>
            </h1>
            <p className="lead">
              A complete AI-powered content system for discovery, strategy, production, publishing and growth, run by one
              team, on repeat, in every Indian language your customers speak.
            </p>
            <div className="btn-row">
              <Link href="/contact?plan=audit" className="btn btn-primary">Book a free content audit →</Link>
              <Link href="/dashboard" className="btn btn-ghost btn-play"><span aria-hidden="true">▶</span> See dashboard demo</Link>
            </div>
            <ul className="hero-checks">
              <li>Strategic, not just creative</li>
              <li>One team, end to end</li>
              <li>Plans from {formatInr(priceInr(plans[0], offer.open))}/month</li>
            </ul>
          </div>
          <HeroDashboard />
        </div>
      </section>

      <section className="section-tight">
        <div className="wrap">
          <div className="section-head section-head-row">
            <div>
              <h2>How Nirakar works</h2>
              <p className="lead">From research to results: a {stageCount}-stage content engine, run by one team.</p>
            </div>
            <Link href="/services" className="eyebrow link-arrow">See every stage →</Link>
          </div>
          <ol className="flow">
            {workflow.map((w, i) => (
              <li key={w.slug} className="flow-card">
                <div className="flow-top"><ServiceIcon slug={w.slug} /><span>{String(i + 1).padStart(2, "0")}</span></div>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </li>
            ))}
          </ol>
          <ul className="highlights">
            {highlights.map((h) => (
              <li key={h.title}><ServiceIcon slug={h.icon} /><div><b>{h.title}</b><span>{h.text}</span></div></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head section-head-row">
            <div>
              <p className="eyebrow">See it work</p>
              <h2>From your business to a published video, and what it brought in</h2>
              <p className="lead">Watch how one video is made, approved, published and tracked on your dashboard. Then try a sample with your own business name.</p>
            </div>
            <Link href="/sample-video" className="eyebrow link-arrow">Try it with your business →</Link>
          </div>
          <WalkthroughPlayer voice={voiceConfigured()} footage={footageConfigured()} />
          <div className="btn-row" style={{ marginTop: 24 }}><Link href="/sample-video" className="btn btn-primary">See sample videos</Link><Link href="/sample-video#free-sample" className="btn btn-ghost">Get a free sample</Link></div>
        </div>
      </section>

      <section className="section">
        <div className="wrap dash-teaser">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <p className="eyebrow">Outcome reporting</p>
            <h2>See the business value, not a list of deliverables</h2>
            <p className="lead">
              &quot;12 reels delivered&quot; tells you nothing. Every month your outcome report shows what those reels did
              for your business, across every platform and language, and your private login dashboard updates every day.
            </p>
            <div className="btn-row"><Link href="/dashboard" className="btn btn-primary">Preview the dashboard</Link><Link href="/login" className="btn btn-ghost">Client login</Link></div>
          </div>
          <ul className="metric-chips">
            {dashboardMetrics.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Multilingual by default</p>
            <h2>One video. Every language your customers speak.</h2>
            <p className="lead">
              India&apos;s next wave of customers watches in Hindi, Tamil, Telugu, Kannada, Malayalam and Marathi. We turn
              each approved video into regional versions with AI dubbing and localisation, then a native speaker checks
              every one.
            </p>
          </div>
          <Languages />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Human + AI</p>
            <h2>AI does the volume. People own the judgment.</h2>
            <p className="lead">AI-only content is fast and forgettable. Ours is fast, and every piece passes through people who care whether it is right.</p>
          </div>
          <HumanAi />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Who it is for</p>
            <h2>You run your business. <span className="grad-text">We run your content engine.</span></h2>
          </div>
          <div className="grid-3">
            {verticals.map((v) => (
              <div key={v.title} className="audience">
                <h3>{v.title}</h3>
                <p className="fine">{v.who}</p>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Pricing</p>
            <h2>Simple, transparent plans for every stage</h2>
            <p className="lead">Every plan includes strategy, production, publishing and analytics, run by one team. ₹0 setup, month-to-month, and you keep 100% of your ad revenue.</p>
          </div>
          <Plans />
          <p style={{ marginTop: 20 }}><Link href="/pricing#stages">Compare every stage by plan →</Link></p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">FAQ</p>
            <h2>Questions people ask before they start</h2>
          </div>
          <div className="faq">
            {faqs.slice(0, 5).map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p style={{ marginTop: 20 }}><Link href="/faq">Read all questions →</Link></p>
        </div>
      </section>

      <Cta />
    </>
  );
}
