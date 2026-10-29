import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND, INK } from "@/lib/report/colors";
import { en as t } from "@/lib/strings";

// Link preview for the landing and other public pages (WhatsApp, Facebook, X). Built once at build time.

export const alt = t.home.metaTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Geist-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Geist-Bold.ttf")),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: BRAND[50], padding: "64px 72px", fontFamily: "Geist", color: INK[900] }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: BRAND[700], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700 }}>
            T
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: BRAND[700] }}>{t.appName}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>{t.home.headline}</div>
          <div style={{ fontSize: 30, color: INK[700], maxWidth: 1000 }}>{t.home.subhead}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, fontWeight: 700 }}>
          <div style={{ background: BRAND[700], color: "#fff", padding: "14px 28px", borderRadius: 16, display: "flex" }}>{t.home.cta}</div>
          <div style={{ color: INK[500], fontWeight: 400, display: "flex" }}>{t.home.eyebrow}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
