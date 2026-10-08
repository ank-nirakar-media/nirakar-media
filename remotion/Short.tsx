import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { captionGroups, FPS, sceneFrames, type Brand, type Layout, type PlanScene, type VideoPlan } from "../lib/video/plan";
import { FONT, loadFonts } from "./fonts";

loadFonts();

// One vertical Short built from a VideoPlan: scenes back to back, captions timed to the voice,
// the client's brand on every frame. Three layouts so a client's feed doesn't look the same every day.
export function Short({ plan }: { plan: VideoPlan }) {
  const starts: number[] = [];
  plan.scenes.reduce((at, s) => (starts.push(at), at + sceneFrames(s)), 0);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0820", fontFamily: FONT, color: "white" }}>
      {plan.scenes.map((scene, i) => (
        <Sequence key={i} from={starts[i]} durationInFrames={sceneFrames(scene)}>
          <SceneView scene={scene} index={i} brand={plan.brand} layout={plan.layout} />
        </Sequence>
      ))}
      {plan.music && <Audio src={plan.music.src} volume={plan.music.volume} loop />}
      <Progress brand={plan.brand} />
      <Footer brand={plan.brand} layout={plan.layout} />
      {plan.watermark && <Watermark text={plan.watermark} />}
    </AbsoluteFill>
  );
}

function SceneView({ scene, index, brand, layout }: { scene: PlanScene; index: number; brand: Brand; layout: Layout }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 12 });
  const visual = <Background scene={scene} index={index} brand={brand} />;

  return (
    <AbsoluteFill style={{ opacity: interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) }}>
      {layout === "clean" ? (
        <AbsoluteFill style={{ background: gradient(brand, index), padding: "200px 70px 0" }}>
          <div style={{ height: 1100, borderRadius: 48, overflow: "hidden", position: "relative", boxShadow: "0 30px 80px rgba(0,0,0,.45)" }}>
            {visual}
          </div>
        </AbsoluteFill>
      ) : (
        visual
      )}
      {layout === "stack" && (
        <>
          <AbsoluteFill style={{ background: brand.primary, height: 360, top: 0 }} />
          <AbsoluteFill style={{ background: brand.primary, height: 300, top: "auto", bottom: 0 }} />
        </>
      )}
      {layout === "bold" && (
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 55%, rgba(0,0,0,.6) 100%)" }} />
      )}
      <Headline text={scene.onScreenText} layout={layout} brand={brand} enter={enter} />
      <Captions scene={scene} brand={brand} layout={layout} />
      {scene.audioSrc && <Audio src={scene.audioSrc} />}
    </AbsoluteFill>
  );
}

function Background({ scene, index, brand }: { scene: PlanScene; index: number; brand: Brand }) {
  const frame = useCurrentFrame();
  const total = sceneFrames(scene);
  const v = scene.visual;
  const cover = { width: "100%", height: "100%", objectFit: "cover" as const };

  if (v.kind === "video") return <OffthreadVideo src={v.src} muted style={cover} />;
  if (v.kind === "image") {
    // Slow push-in, alternating direction, so stills feel alive.
    const scale = interpolate(frame, [0, total], index % 2 ? [1.15, 1.02] : [1.02, 1.15]);
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img src={v.src} style={{ ...cover, transform: `scale(${scale})` }} />
      </AbsoluteFill>
    );
  }
  const shift = interpolate(frame, [0, total], [0, 40]);
  return (
    <AbsoluteFill style={{ background: gradient(brand, index), overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", background: brand.accent, opacity: 0.25, filter: "blur(120px)", left: -200 + shift * 4, top: 300 + shift * 3 }} />
      <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: "#ffffff", opacity: 0.08, filter: "blur(100px)", right: -150 - shift * 3, bottom: 300 }} />
    </AbsoluteFill>
  );
}

function Headline({ text, layout, brand, enter }: { text: string; layout: Layout; brand: Brand; enter: number }) {
  if (!text) return null;
  const y = interpolate(enter, [0, 1], [40, 0]);
  const base = { position: "absolute" as const, left: 70, right: 70, textAlign: "center" as const, fontWeight: 800, lineHeight: 1.05, opacity: enter, transform: `translateY(${y}px)` };
  if (layout === "clean")
    return <div style={{ ...base, top: 70, fontSize: 84, color: "white" }}>{text}</div>;
  if (layout === "stack")
    return <div style={{ ...base, top: 90, fontSize: 96, color: "white", textShadow: "0 4px 0 rgba(0,0,0,.25)" }}>{text}</div>;
  return (
    <div style={{ ...base, top: 220, fontSize: 112, lineHeight: 1.42, textTransform: "uppercase", textShadow: "0 6px 30px rgba(0,0,0,.6)" }}>
      <span style={{ background: brand.primary, padding: "0 28px", borderRadius: 18, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{text}</span>
    </div>
  );
}

// Three-word caption lines, the spoken word highlighted in the brand accent with a small pop.
function Captions({ scene, brand, layout }: { scene: PlanScene; brand: Brand; layout: Layout }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const groups = captionGroups(scene.words);
  const group = groups.find((g, i) => t >= g[0].start && (t < (groups[i + 1]?.[0].start ?? Infinity)));
  if (!group) return null;
  const top = layout === "clean" ? 1380 : layout === "stack" ? 1180 : 1150;

  return (
    <div style={{ position: "absolute", left: 50, right: 50, top, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 32px" }}>
      {group.map((w, i) => {
        const active = t >= w.start && t < w.end;
        const pop = active ? interpolate(t - w.start, [0, 0.12], [0.9, 1.08], { extrapolateRight: "clamp" }) : 1;
        return (
          <span
            key={i}
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 1.2,
              color: active ? brand.accent : "white",
              transform: `scale(${pop})`,
              display: "inline-block",
              WebkitTextStroke: "3px rgba(0,0,0,.85)",
              paintOrder: "stroke fill",
              textShadow: "0 6px 18px rgba(0,0,0,.55)",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
}

function Progress({ brand }: { brand: Brand }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", top: 0, left: 0, height: 10, width: `${(frame / durationInFrames) * 100}%`, background: brand.accent }} />
  );
}

function Footer({ brand, layout }: { brand: Brand; layout: Layout }) {
  const onBar = layout === "stack";
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: onBar ? 90 : 120, display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
      {brand.logoSrc ? (
        <Img src={brand.logoSrc} style={{ width: 84, height: 84, borderRadius: 20, objectFit: "cover", background: "white" }} />
      ) : (
        <div style={{ width: 84, height: 84, borderRadius: 20, background: onBar ? "white" : brand.primary, color: onBar ? brand.primary : "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, fontWeight: 800 }}>
          {[...brand.name][0]}
        </div>
      )}
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: 46, fontWeight: 800 }}>{brand.name}</div>
        {brand.handle && <div style={{ fontSize: 34, fontWeight: 500, opacity: 0.85 }}>{brand.handle}</div>}
      </div>
    </div>
  );
}

function Watermark({ text }: { text: string }) {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ transform: "rotate(-30deg)", fontSize: 74, fontWeight: 800, color: "rgba(255,255,255,.16)", whiteSpace: "nowrap", letterSpacing: 2 }}>
        {text}
      </div>
    </AbsoluteFill>
  );
}

function gradient(brand: Brand, index: number) {
  const angle = [160, 200, 135, 225][index % 4];
  return `linear-gradient(${angle}deg, ${brand.primary} 0%, #1A1040 70%, #0B0820 100%)`;
}
