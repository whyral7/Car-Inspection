// Treadmark fonts via next/font/local: self-hosted from brand/fonts/web, so builds never depend on
// Google Fonts being reachable. Martel Sans covers Latin and Devanagari (Hindi); IBM Plex Mono sets readings and IDs.
// Both SIL Open Font License (brand/fonts/OFL-*.txt).
// In app/layout.tsx: <html className={`${martelSans.variable} ${plexMono.variable}`}>
import localFont from "next/font/local";

export const martelSans = localFont({
  src: [
    { path: "../fonts/web/MartelSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/web/MartelSans-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/web/MartelSans-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/web/MartelSans-ExtraBold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-martel-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const plexMono = localFont({
  src: [
    { path: "../fonts/web/IBMPlexMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/web/IBMPlexMono-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
  fallback: ["ui-monospace", "Menlo", "monospace"],
});
