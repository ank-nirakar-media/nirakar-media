import type { ReactNode } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS, type VideoPlan } from "../lib/video/plan";
import { walkFrames, walkScenes, type WalkScene } from "../lib/video/walkthrough";
import { FONT, loadFonts } from "./fonts";
import { Short } from "./Short";

loadFonts();

// The narrated product walkthrough (16:9): Brand Brain, script, the Short being made, approval,
// publishing, and the dashboard that tracks it. Scene lengths follow the narration audio.
export type WalkProps = { durations: number[]; audio?: string[]; phonePlan: VideoPlan };

const C = { ink: "#07081A", card: "#121433", line: "rgba(196,181,253,.18)", violet: "#8B5CF6", soft: "#C4B5FD", pink: "#D08BFF", muted: "#A7A3C9", green: "#34D399" };

export { walkFrames };

export function Walkthrough({ durations, audio, phonePlan }: WalkProps) {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1200px 700px at 75% 20%, rgba(139,92,246,.22), transparent), ${C.ink}`, fontFamily: FONT, color: "white" }}>
      {walkScenes.map((s, i) => {
        const len = Math.round((durations[i] ?? 4) * FPS);
        const from = at;
        at += len;
        return (
          <Sequence key={s.id} from={from} durationInFrames={len}>
            <SceneFrame len={len} scene={s} index={i}>
              {s.id === "intro" && <Intro />}
              {s.id === "brand" && <BrandBrain len={len} />}
              {s.id === "script" && <Script len={len} />}
              {s.id === "video" && <Making plan={phonePlan} />}
              {s.id === "approve" && <Approve len={len} />}
              {s.id === "publish" && <Publish len={len} />}
              {s.id === "dashboard" && <Dashboard len={len} />}
              {s.id === "cta" && <Cta />}
            </SceneFrame>
            {audio?.[i] && <Audio src={audio[i]} />}
          </Sequence>
        );
      })}
      <TopBar />
      <Progress />
    </AbsoluteFill>
  );
}

function SceneFrame({ len, scene, index, children }: { len: number; scene: WalkScene; index: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 8, len - 8, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const showStep = index > 0 && scene.id !== "cta";
  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
      {showStep && (
        <div style={{ position: "absolute", left: 96, bottom: 84, padding: "14px 28px", borderRadius: 999, background: "rgba(139,92,246,.18)", border: `1px solid ${C.line}`, fontSize: 38, fontWeight: 800, color: C.soft }}>
          {scene.caption}
        </div>
      )}
    </AbsoluteFill>
  );
}

const enter = (f: number, fps: number, delay = 0) => spring({ frame: f - delay, fps, config: { damping: 200 }, durationInFrames: 18 });
const rise = (p: number, by = 40) => ({ opacity: p, transform: `translateY(${(1 - p) * by}px)` });

function TopBar() {
  return (
    <div style={{ position: "absolute", top: 56, left: 96, display: "flex", alignItems: "center", gap: 18 }}>
      <Mark size={56} />
      <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: 2 }}>NIRAKAR <span style={{ fontWeight: 500, color: C.soft, fontSize: 24, letterSpacing: 6 }}>MEDIA</span></span>
    </div>
  );
}

function Progress() {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: `${(f / durationInFrames) * 100}%`, background: `linear-gradient(90deg, ${C.pink}, ${C.violet})` }} />;
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <defs>
        <linearGradient id="wm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D08BFF" /><stop offset=".5" stopColor="#8B5CF6" /><stop offset="1" stopColor="#4F6BFF" /></linearGradient>
      </defs>
      <circle cx="60" cy="60" r="42" fill="none" stroke="url(#wm)" strokeWidth="12" strokeLinecap="round" strokeDasharray="214 50" transform="rotate(-30 60 60)" />
      <path d="M50 40 Q50 36 54 38 L80 56 Q84 60 80 64 L54 82 Q50 84 50 80 Z" fill="url(#wm)" />
      <circle cx="97" cy="24" r="6" fill="#D08BFF" />
    </svg>
  );
}

function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 32, boxShadow: "0 40px 120px rgba(0,0,0,.45)", ...style }}>{children}</div>;
}

function Title({ kicker, text }: { kicker: string; text: string }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 96, top: 240, width: 640, ...rise(enter(f, fps)) }}>
      <div style={{ fontSize: 28, letterSpacing: 6, color: C.soft, fontWeight: 500, textTransform: "uppercase" }}>{kicker}</div>
      <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 18 }}>{text}</div>
    </div>
  );
}

function Intro() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = enter(f, fps), b = enter(f, fps, 14);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ transform: `scale(${0.7 + a * 0.3})`, opacity: a }}><Mark size={200} /></div>
      <div style={{ fontSize: 96, fontWeight: 800, marginTop: 40, ...rise(a) }}>You run your business.</div>
      <div style={{ fontSize: 96, fontWeight: 800, background: `linear-gradient(90deg, ${C.pink}, ${C.violet} 60%, #4F6BFF)`, WebkitBackgroundClip: "text", color: "transparent", ...rise(b) }}>
        We run your content engine.
      </div>
    </AbsoluteFill>
  );
}

const brandRows = [
  ["Business", "Smile Dental Clinic, Indiranagar"],
  ["Customers", "Families and office-goers nearby"],
  ["Language", "Hinglish"],
  ["Goal", "More check-up bookings"],
];

function BrandBrain({ len }: { len: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const per = (len * 0.7) / brandRows.length;
  return (
    <>
      <Title kicker="Brand Brain" text="We learn your business once" />
      <Card style={{ position: "absolute", right: 120, top: 170, width: 900, padding: "40px 56px", ...rise(enter(f, fps, 6)) }}>
        <div style={{ fontSize: 34, fontWeight: 800, marginBottom: 22 }}>Your Brand Brain</div>
        {brandRows.map(([k, v], i) => {
          const start = 12 + i * per;
          const shown = Math.floor(interpolate(f, [start, start + per * 0.8], [0, v.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
          return (
            <div key={k} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 24, color: C.muted, fontWeight: 500 }}>{k}</div>
              <div style={{ marginTop: 8, padding: "12px 24px", borderRadius: 16, background: "rgba(255,255,255,.04)", border: `1px solid ${C.line}`, fontSize: 34, fontWeight: 500, minHeight: 48 }}>
                {v.slice(0, shown)}{shown > 0 && shown < v.length ? <span style={{ color: C.pink }}>|</span> : null}
              </div>
            </div>
          );
        })}
      </Card>
    </>
  );
}

const scriptLines = ["Daant mein dard? Ise ignore mat kijiye.", "Aaj ki chhoti cavity, kal ka root canal ban sakti hai.", "Saal mein do baar checkup karwaiye.", "Aaj hi appointment book kijiye."];

function Script({ len }: { len: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const checked = enter(f, fps, Math.round(len * 0.62));
  return (
    <>
      <Title kicker="Script" text="AI writes it. A person checks it." />
      <Card style={{ position: "absolute", right: 120, top: 210, width: 900, padding: 56, ...rise(enter(f, fps, 6)) }}>
        <div style={{ fontSize: 34, fontWeight: 800, marginBottom: 30 }}>Script · Short · Hinglish</div>
        {scriptLines.map((l, i) => (
          <div key={l} style={{ display: "flex", gap: 20, fontSize: 36, lineHeight: 1.35, marginBottom: 22, ...rise(enter(f, fps, 14 + i * 12), 20) }}>
            <span style={{ color: C.soft, fontWeight: 800, minWidth: 40 }}>{i + 1}</span>
            <span>{l}</span>
          </div>
        ))}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginTop: 20, padding: "14px 26px", borderRadius: 999, background: "rgba(52,211,153,.14)", color: C.green, fontSize: 30, fontWeight: 800, opacity: checked, transform: `scale(${0.8 + checked * 0.2})` }}>
          ✓ Checked by our team
        </div>
      </Card>
    </>
  );
}

const features = ["Indian AI voice", "Stock footage", "Word-by-word captions", "Your brand colours"];

function Making({ plan }: { plan: VideoPlan }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = 0.44;
  return (
    <>
      <Title kicker="The engine" text="Your video, made by the engine" />
      <div style={{ position: "absolute", left: 830, top: 110, width: 1080 * scale + 28, height: 1920 * scale + 28, borderRadius: 64, background: "#000", padding: 14, boxShadow: "0 40px 120px rgba(0,0,0,.6)", border: "2px solid #2A2D55", ...rise(enter(f, fps, 4)) }}>
        <div style={{ width: 1080 * scale, height: 1920 * scale, borderRadius: 50, overflow: "hidden", position: "relative" }}>
          <div style={{ width: 1080, height: 1920, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute" }}>
            <Short plan={plan} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 1360, top: 300, width: 470, display: "grid", gap: 26 }}>
        {features.map((t, i) => (
          <div key={t} style={{ padding: "18px 28px", borderRadius: 20, background: C.card, border: `1px solid ${C.line}`, fontSize: 32, fontWeight: 800, ...rise(enter(f, fps, 20 + i * 14), 30) }}>
            <span style={{ color: C.pink }}>✦</span> {t}
          </div>
        ))}
      </div>
    </>
  );
}

function Approve({ len }: { len: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const press = Math.round(len * 0.45);
  const done = enter(f, fps, press + 4);
  const tap = interpolate(f, [press - 6, press, press + 6], [1, 0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Title kicker="Approval" text="You approve it from your phone" />
      <Card style={{ position: "absolute", right: 200, top: 250, width: 760, padding: 52, ...rise(enter(f, fps, 6)) }}>
        <div style={{ fontSize: 26, color: C.muted }}>Nirakar Media · now</div>
        <div style={{ fontSize: 44, fontWeight: 800, marginTop: 14 }}>Your video is ready to review</div>
        <div style={{ fontSize: 32, color: C.muted, marginTop: 10 }}>&quot;Daant mein dard?&quot; · 30-second Short</div>
        <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "22px 0", borderRadius: 18, fontSize: 34, fontWeight: 800, transform: `scale(${tap})`, background: done > 0.5 ? C.green : `linear-gradient(90deg, ${C.pink}, ${C.violet})`, color: done > 0.5 ? "#06281C" : "white" }}>
            {done > 0.5 ? "✓ Approved" : "Approve"}
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: "22px 0", borderRadius: 18, fontSize: 34, fontWeight: 800, border: `1px solid ${C.line}`, color: C.soft, opacity: 1 - done * 0.6 }}>Ask for changes</div>
        </div>
        <div style={{ fontSize: 28, color: C.muted, marginTop: 30 }}>No reply in 48 hours? It approves itself.</div>
      </Card>
    </>
  );
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Publish({ len }: { len: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = enter(f, fps, 16);
  const live = enter(f, fps, Math.round(len * 0.6));
  return (
    <>
      <Title kicker="Publishing" text="Posted on schedule, everywhere" />
      <Card style={{ position: "absolute", right: 120, top: 250, width: 960, padding: 44, ...rise(enter(f, fps, 4)) }}>
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 26 }}>Content calendar</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
          {days.map((d, i) => (
            <div key={d} style={{ height: 300, borderRadius: 16, border: `1px solid ${C.line}`, background: "rgba(255,255,255,.03)", padding: 12, position: "relative" }}>
              <div style={{ fontSize: 24, color: C.muted }}>{d}</div>
              {i === 4 && (
                <div style={{ position: "absolute", left: 8, right: 8, top: 56, padding: 12, borderRadius: 12, background: `linear-gradient(160deg, ${C.violet}, #4F3BB0)`, fontSize: 19, fontWeight: 800, lineHeight: 1.3, ...rise(drop, -60) }}>
                  Daant mein dard?
                  <div style={{ marginTop: 10, fontSize: 15, fontWeight: 800, color: live > 0.5 ? C.green : C.soft }}>{live > 0.5 ? "Published" : "Scheduled"}</div>
                </div>
              )}
              {i === 1 && <div style={{ position: "absolute", left: 8, right: 8, top: 56, padding: 12, borderRadius: 12, background: "rgba(139,92,246,.25)", fontSize: 20, fontWeight: 800 }}>Braces myths</div>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 28 }}>
          {["YouTube Shorts", "Instagram Reels"].map((p, i) => (
            <div key={p} style={{ padding: "12px 24px", borderRadius: 999, border: `1px solid ${C.line}`, fontSize: 28, fontWeight: 800, ...rise(enter(f, fps, 30 + i * 10), 20) }}>{p}</div>
          ))}
        </div>
      </Card>
    </>
  );
}

// Example figures for a local clinic's month, shown with an on-screen "example" label.
const kpis = [
  { label: "Views", value: 18420, fmt: (n: number) => Math.round(n).toLocaleString("en-IN") },
  { label: "Engagement", value: 6.8, fmt: (n: number) => `${n.toFixed(1)}%` },
  { label: "Leads", value: 46, fmt: (n: number) => String(Math.round(n)) },
  { label: "Videos published", value: 12, fmt: (n: number) => String(Math.round(n)) },
];
const points = [3, 5, 4, 8, 11, 10, 15, 19, 18, 26, 31, 38];

function Dashboard({ len }: { len: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = interpolate(f, [10, len * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const w = 1000, h = 260, max = 40;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - (p / max) * h] as const);
  const path = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <>
      <Card style={{ position: "absolute", left: 96, right: 96, top: 170, bottom: 190, padding: 48, ...rise(enter(f, fps, 2), 30) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 40, fontWeight: 800 }}>Smile Dental Clinic · Last 30 days</div>
          <div style={{ fontSize: 24, color: C.muted, padding: "8px 18px", borderRadius: 999, border: `1px solid ${C.line}` }}>Example dashboard. Your numbers will differ.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginTop: 36 }}>
          {kpis.map((k, i) => (
            <div key={k.label} style={{ padding: 28, borderRadius: 22, background: "rgba(255,255,255,.04)", border: `1px solid ${C.line}`, ...rise(enter(f, fps, 6 + i * 6), 20) }}>
              <div style={{ fontSize: 26, color: C.muted }}>{k.label}</div>
              <div style={{ fontSize: 64, fontWeight: 800, marginTop: 6 }}>{k.fmt(k.value * grow)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 40, marginTop: 36, alignItems: "flex-end" }}>
          <svg width={w} height={h + 10} viewBox={`0 -5 ${w} ${h + 10}`}>
            <defs><linearGradient id="wfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8B5CF6" stopOpacity=".45" /><stop offset="1" stopColor="#8B5CF6" stopOpacity="0" /></linearGradient></defs>
            <clipPath id="wclip"><rect x="0" y="-5" width={w * grow} height={h + 10} /></clipPath>
            <g clipPath="url(#wclip)">
              <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#wfill)" />
              <path d={path} fill="none" stroke="#C4B5FD" strokeWidth="5" />
            </g>
          </svg>
          <div style={{ flex: 1, display: "grid", gap: 18 }}>
            <div style={{ fontSize: 26, color: C.muted }}>Best video this month</div>
            <div style={{ fontSize: 38, fontWeight: 800 }}>&quot;Daant mein dard?&quot;</div>
            <div style={{ fontSize: 28, color: C.green, fontWeight: 800, opacity: grow }}>Brought in the most leads</div>
            <div style={{ fontSize: 26, color: C.soft, opacity: grow }}>Next: two more pain-and-prevention Shorts</div>
          </div>
        </div>
      </Card>
    </>
  );
}

function Cta() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = enter(f, fps), b = enter(f, fps, 12);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ fontSize: 100, fontWeight: 800, ...rise(a) }}>Get a free sample video</div>
      <div style={{ fontSize: 56, fontWeight: 500, color: C.soft, marginTop: 10, ...rise(a) }}>made for your business, in your language</div>
      <div style={{ marginTop: 60, padding: "28px 56px", borderRadius: 999, background: `linear-gradient(90deg, ${C.pink}, ${C.violet})`, fontSize: 48, fontWeight: 800, ...rise(b) }}>nirakarmedia.com/sample-video</div>
    </AbsoluteFill>
  );
}
