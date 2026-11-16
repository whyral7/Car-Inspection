// Treadmark fonts via next/font/local: self-hosted from brand/fonts/web/subsets, so builds never depend on
// Google Fonts being reachable. Martel Sans covers Latin and Devanagari (Hindi); IBM Plex Mono sets readings and IDs.
// Both SIL Open Font License (brand/fonts/OFL-*.txt).
//
// Each font is split by script (brand/scripts/subset-fonts.py) and loaded with a unicode-range, so the
// browser fetches the Devanagari files only when a page shows Hindi and the rarely used accented Latin
// only when a name needs it. Only the Latin files are preloaded: about 54 KB instead of 308 KB.
// brand/tokens/treadmark-base.css joins the parts back into --font-martel-sans and --font-plex-mono.
//
// In app/layout.tsx: <html className={fontVariables}>
import localFont from "next/font/local";

// next/font needs every value written out, so the ranges are repeated per font. Keep them in step with
// RANGES in brand/scripts/subset-fonts.py. The "ext" ranges are a little wider than the glyph list; a
// character the Latin file already has is found there first.

const martelLatin = localFont({
  src: [
    { path: "../fonts/web/subsets/MartelSans-Regular-latin.woff2", weight: "400", style: "normal" },
    { path: "../fonts/web/subsets/MartelSans-SemiBold-latin.woff2", weight: "600", style: "normal" },
    { path: "../fonts/web/subsets/MartelSans-Bold-latin.woff2", weight: "700", style: "normal" },
    { path: "../fonts/web/subsets/MartelSans-ExtraBold-latin.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-martel-latin",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+20B9,U+2122,U+2190-2193,U+2212,U+2215,U+25CF,U+2713,U+FEFF,U+FFFD" }],
});

const martelDevanagari = localFont({
  src: [
    { path: "../fonts/web/subsets/MartelSans-Regular-devanagari.woff2", weight: "400", style: "normal" },
    { path: "../fonts/web/subsets/MartelSans-SemiBold-devanagari.woff2", weight: "600", style: "normal" },
    { path: "../fonts/web/subsets/MartelSans-Bold-devanagari.woff2", weight: "700", style: "normal" },
    { path: "../fonts/web/subsets/MartelSans-ExtraBold-devanagari.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-martel-devanagari",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+25CC,U+A830-A839,U+A8E0-A8FF" }],
});

const martelExt = localFont({
  src: [
    { path: "../fonts/web/subsets/MartelSans-Regular-latin-ext.woff2", weight: "400", style: "normal" },
    { path: "../fonts/web/subsets/MartelSans-SemiBold-latin-ext.woff2", weight: "600", style: "normal" },
    { path: "../fonts/web/subsets/MartelSans-Bold-latin-ext.woff2", weight: "700", style: "normal" },
    { path: "../fonts/web/subsets/MartelSans-ExtraBold-latin-ext.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-martel-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-024F,U+02C7,U+02D8-02DD,U+0326,U+03A9,U+03BC,U+03C0,U+2202-2265,U+25CA,U+FB01-FB02" }],
});

const plexLatin = localFont({
  src: [
    { path: "../fonts/web/subsets/IBMPlexMono-Regular-latin.woff2", weight: "400", style: "normal" },
    { path: "../fonts/web/subsets/IBMPlexMono-Medium-latin.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-latin",
  display: "swap",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+20B9,U+2122,U+2190-2193,U+2212,U+2215,U+25CF,U+2713,U+FEFF,U+FFFD" }],
});

const plexExt = localFont({
  src: [
    { path: "../fonts/web/subsets/IBMPlexMono-Regular-latin-ext.woff2", weight: "400", style: "normal" },
    { path: "../fonts/web/subsets/IBMPlexMono-Medium-latin-ext.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-024F,U+0259,U+02C7,U+02D8-02DD,U+0300-0328,U+03C0,U+0400-04FF,U+0E3F,U+1E80-1EF9,U+2070,U+2075-2089,U+20A1-20BF,U+2113-215E,U+2194-21C6,U+2202-2265,U+2500-259F,U+25CA,U+274C,U+2B0E-2B11,U+FB01-FB02" }],
});

// The word "हिंदी" on the language switch (components/language-toggle.tsx), on every English page.
const martelToggle = localFont({
  src: [{ path: "../fonts/web/subsets/MartelSans-SemiBold-toggle.woff2", weight: "600", style: "normal" }],
  variable: "--font-martel-toggle",
  display: "swap",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0902,U+0926,U+0939,U+093F,U+0940" }],
});

/** Class names for <html>: they define the --font-* parts the brand CSS joins together. */
export const fontVariables = [martelLatin, martelDevanagari, martelExt, martelToggle, plexLatin, plexExt].map((font) => font.variable).join(" ");
