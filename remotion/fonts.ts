import { continueRender, delayRender, staticFile } from "remotion";

// Baloo 2 covers Latin and Devanagari (Hindi, Marathi) in one friendly display style (SIL Open Font
// License, copy in public/fonts). The files live in public/fonts, so renders never depend on a font CDN
// and the same composition plays on the website through Remotion Player. Other scripts come per language later.
export const FONT = "'Baloo Latin', 'Baloo Deva', sans-serif";

const faces: [string, string, string][] = [
  ["Baloo Latin", "fonts/baloo-2-latin-500-normal.woff2", "500"],
  ["Baloo Latin", "fonts/baloo-2-latin-800-normal.woff2", "800"],
  ["Baloo Deva", "fonts/baloo-2-devanagari-500-normal.woff2", "500"],
  ["Baloo Deva", "fonts/baloo-2-devanagari-800-normal.woff2", "800"],
];

let loading: Promise<unknown> | null = null;

// Called by the composition. Holds the render until the fonts are in, so no frame uses a fallback font.
export function loadFonts() {
  if (typeof document === "undefined" || loading) return;
  const handle = delayRender("Loading fonts");
  loading = Promise.all(
    faces.map(([family, file, weight]) =>
      new FontFace(family, `url(${staticFile(file)}) format('woff2')`, { weight }).load().then((f) => document.fonts.add(f)),
    ),
  )
    .catch((err) => console.error("Font load failed", err))
    .finally(() => continueRender(handle));
}
