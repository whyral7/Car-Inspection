import { ImageResponse } from "next/og";
import { ogArt, ogFonts } from "@/lib/report/brand-assets";
import { C } from "@/lib/report/colors";
import { t } from "@/lib/strings";

// Link preview for the landing and other public pages (WhatsApp, Facebook, X). Built once at build time.
// Treadmark brand: Paper ground, primary lockup, ink headline, one olive button, the seal.

export const alt = t.home.metaTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [fonts, art] = await Promise.all([ogFonts(), ogArt()]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: C.paper, padding: "64px 72px", fontFamily: "Martel Sans", color: C.ink }}>
        <img src={art.lockup} alt="" width={420} height={86} />
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.08, letterSpacing: -0.6 }}>{t.home.headline}</div>
            <div style={{ fontSize: 30, color: C.muted, lineHeight: 1.35 }}>{t.home.subhead}</div>
          </div>
          <img src={art.seal} alt="" width={200} height={200} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28, fontWeight: 700 }}>
          <div style={{ background: C.olive, color: C.white, padding: "14px 28px", borderRadius: 12, display: "flex" }}>{t.home.cta}</div>
          <div style={{ color: C.subtle, fontWeight: 400, display: "flex" }}>{t.home.eyebrow}</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
