import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Brand fonts and artwork for the PDF and the link preview images, read from assets/ (traced into the
// serverless bundle by next.config.ts). Martel Sans covers Latin and Devanagari; IBM Plex Mono sets
// plates, readings and prices. Both SIL Open Font License (assets/fonts/OFL-*.txt).

const dir = (...p: string[]) => join(process.cwd(), "assets", ...p);

export const FONT_FILES = {
  regular: dir("fonts", "MartelSans-Regular.ttf"),
  semibold: dir("fonts", "MartelSans-SemiBold.ttf"),
  bold: dir("fonts", "MartelSans-Bold.ttf"),
  extrabold: dir("fonts", "MartelSans-ExtraBold.ttf"),
  mono: dir("fonts", "IBMPlexMono-Regular.ttf"),
  monoMedium: dir("fonts", "IBMPlexMono-Medium.ttf"),
} as const;

/** PNG paths for react-pdf, which takes raster images. */
export const PDF_ART = {
  lockupSmall: dir("brand", "lockup-small-color.png"),
  seal: dir("brand", "seal-olive.png"),
} as const;

/** Fonts for next/og ImageResponse. */
export async function ogFonts() {
  const [regular, bold, extrabold, mono] = await Promise.all([
    readFile(FONT_FILES.regular),
    readFile(FONT_FILES.bold),
    readFile(FONT_FILES.extrabold),
    readFile(FONT_FILES.monoMedium),
  ]);
  return [
    { name: "Martel Sans", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Martel Sans", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Martel Sans", data: extrabold, weight: 800 as const, style: "normal" as const },
    { name: "IBM Plex Mono", data: mono, weight: 500 as const, style: "normal" as const },
  ];
}

/** SVG artwork as data URIs for next/og (Satori draws SVG images directly). */
export async function ogArt() {
  const svg = async (name: string) => `data:image/svg+xml;base64,${(await readFile(dir("brand", name))).toString("base64")}`;
  const [lockup, lockupSmall, mark, seal] = await Promise.all([
    svg("treadmark-lockup-horizontal-color.svg"),
    svg("treadmark-lockup-small-color.svg"),
    svg("treadmark-mark-small-color.svg"),
    svg("treadmark-seal-olive.svg"),
  ]);
  return { lockup, lockupSmall, mark, seal };
}
