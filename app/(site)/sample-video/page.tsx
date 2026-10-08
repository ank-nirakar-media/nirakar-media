import type { Metadata } from "next";
import { SamplePlayer } from "@/components/SamplePlayer";
import { WalkthroughPlayer } from "@/components/WalkthroughPlayer";
import { VideoTry } from "@/components/VideoTry";
import { samples } from "@/lib/video/samples";
import { footageConfigured } from "@/lib/video/footage";
import { voiceConfigured } from "@/lib/video/voice";
import { loadVoiceSettings, settingsKey } from "@/lib/video/voice-settings";
import { SAMPLE_LANGUAGES } from "@/lib/video/requests";

export const metadata: Metadata = {
  title: "Sample videos",
  description: "See the short videos the Nirakar content engine makes, try one with your business name, and ask for a free sample.",
};

const steps = [
  { title: "Script", text: "We write the script from your Brand Brain: your offer, your customers, your language." },
  { title: "Voice", text: "An AI voice reads it in Hindi, English, Hinglish or another Indian language." },
  { title: "Visuals", text: "Licensed stock footage chosen for each line, in your brand colours." },
  { title: "Captions", text: "Word-by-word captions, because most people watch on mute." },
  { title: "Your approval", text: "A person on our team checks every video, then you approve it before it goes out." },
];

type Search = { sent?: string; already?: string; error?: string };

export default async function SampleVideoPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { sent, already, error } = await searchParams;
  const voice = voiceConfigured() ? settingsKey(await loadVoiceSettings()) : null;
  const footage = footageConfigured();
  return (
    <>
      <section className="wrap page-hero">
        <p className="eyebrow">Sample videos</p>
        <h1>See what the <span className="grad-text">engine makes</span></h1>
        <p className="lead">
          These are made by the same engine that makes client videos. The businesses are examples. {voice
            ? "Press play to hear them."
            : "Previews here play silently in your browser; finished videos come with voice, footage and music."}
        </p>
      </section>

      <section className="section-tight">
        <div className="wrap">
          <WalkthroughPlayer voice={voice} footage={footage} />
          <p className="fine video-credit">How one video is made, approved, published and tracked. The dashboard in it shows example numbers.</p>
        </div>
      </section>

      <section className="section-tight">
        <div className="wrap section-head" style={{ marginBottom: 24 }}><h2>Example Shorts</h2></div>
        <div className="wrap video-gallery">
          {samples.map((s) => (
            <figure key={s.id} className="video-card">
              <SamplePlayer id={s.id} voice={voice} footage={footage} label={`Example: ${s.niche} video in ${s.language}`} />
              <figcaption><b>{s.niche}</b><span>{s.language}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Try it</p>
            <h2>Put your business in it</h2>
            <p className="lead">Type your business name and pick your colour. The video updates as you type.</p>
          </div>
          <VideoTry voice={voice} footage={footage} />
        </div>
      </section>

      <section className="section-tight">
        <div className="wrap">
          <div className="section-head"><h2>How every video is made</h2></div>
          <ol className="flow">
            {steps.map((s, i) => (
              <li key={s.title} className="flow-card">
                <div className="flow-top"><span>{String(i + 1).padStart(2, "0")}</span></div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" id="free-sample">
        <div className="wrap contact-grid">
          <div className="card">
            <h2>Get a free sample for your business</h2>
            <p className="muted">One free 30-second video, with voice, made for your business. We review every request and reply by email.</p>
            {sent && <p className="notice" role="status">Thanks, your request is in. We will email you when your sample is ready, or if we need anything.</p>}
            {already && <p className="notice" role="status">We already have a sample request for this phone number. We will be in touch by email.</p>}
            {error && <p className="notice" role="alert">Please fill in your name, business, a valid email and a 10-digit phone number, then send again.</p>}
            <form className="form" action="/api/sample-request" method="post">
              <div className="grid-2" style={{ gap: 16 }}>
                <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" required autoComplete="name" maxLength={120} /></div>
                <div className="field"><label htmlFor="business">Business name</label><input id="business" name="business" required maxLength={120} /></div>
                <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" maxLength={120} /></div>
                <div className="field"><label htmlFor="phone">WhatsApp or phone</label><input id="phone" name="phone" type="tel" required autoComplete="tel" maxLength={20} /></div>
                <div className="field"><label htmlFor="niche">What kind of business?</label><input id="niche" name="niche" placeholder="Dental clinic, café, CA firm..." maxLength={120} /></div>
                <div className="field">
                  <label htmlFor="language">Language</label>
                  <select id="language" name="language" defaultValue="Hinglish">
                    {SAMPLE_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label htmlFor="topic">What should the video be about? (optional)</label><textarea id="topic" name="topic" maxLength={500} placeholder="A new offer, a common customer question, your opening hours..." /></div>
              <div className="hp" aria-hidden="true"><label htmlFor="website">Leave this empty</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
              <div><button type="submit" className="btn btn-primary">Request my free sample</button></div>
            </form>
          </div>
          <aside className="card">
            <p className="eyebrow">Good to know</p>
            <ul className="stack" style={{ gap: 10, paddingLeft: 18 }}>
              <li>One free sample per business.</li>
              <li>The sample carries a small Nirakar Media watermark.</li>
              <li>No payment details needed.</li>
              <li>We only use your details to make and send the sample. See our <a href="/legal/privacy">privacy policy</a>.</li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
