import "server-only";
import { ImageResponse } from "next/og";
import { scoreBars } from "@/lib/score";
import { en as t } from "@/lib/strings";
import { ogArt, ogFonts } from "./brand-assets";
import { C } from "./colors";
import type { ReportView } from "./view";

// The link preview image WhatsApp shows above a shared report link: 1200x630 PNG on Paper, flat colours so it
// stays small (well under WhatsApp's ~300 KB limit). Treadmark brand: ink score with grade word, plate in mono.

const assets = Promise.all([ogFonts(), ogArt()]);

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

function facts(view: ReportView) {
  const f = t.publicReport.ogFacts;
  const checklistItems = (view.checklist?.groups.reduce((n, g) => n + g.items.length, 0) ?? 0) + (view.documents?.items.length ?? 0);
  return [
    view.photos?.length ? f.photos(view.photos.length) : null,
    view.findings ? f.findings(view.findings.length) : null,
    checklistItems ? f.checklist(checklistItems) : null,
  ].filter(Boolean) as string[];
}

/**
 * `logo` and `photo` are data: URIs (PNG or JPEG) or null. Without a logo the Treadmark symbol stands in;
 * with a photo (the report's first, normally the front of the car) it fills a panel on the left, untouched.
 */
export async function reportOgImage(view: ReportView, logo: string | null, photo: string | null, headers?: Record<string, string>) {
  const [fonts, art] = await assets;
  const filled = scoreBars(view.score);
  const dealerLine = [view.dealer.name, view.dealer.city].filter(Boolean).join(" · ");
  // With the photo panel the text column is 780px wide instead of 1200px, so type steps down and titles clip sooner.
  const k = photo ? 0.72 : 1;
  const px = (n: number) => Math.round(n * k);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: C.paper, fontFamily: "Martel Sans", color: C.ink }}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page
          <img src={photo} alt="" width={420} height={630} style={{ objectFit: "cover" }} />
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: photo ? "36px 40px 30px" : "44px 56px 36px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: px(20) }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page */}
            <img src={logo ?? art.mark} alt="" width={px(72)} height={px(72)} style={{ borderRadius: 10, objectFit: "contain", border: logo ? `2px solid ${C.border}` : "none" }} />
            <div style={{ flex: 1, display: "flex", fontSize: px(34), fontWeight: 700 }}>{clip(dealerLine, Math.round(40 * k))}</div>
            {!photo && <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 2, color: C.subtle }}>{t.publicReport.heading.toUpperCase()}</div>}
          </div>

          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: px(40) }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ display: "flex", border: `4px solid ${C.ink}`, borderRadius: 8, padding: "2px 16px", fontFamily: "IBM Plex Mono", fontSize: px(42), fontWeight: 500, letterSpacing: 4 }}>
                {view.car.regNumber}
              </div>
              <div style={{ display: "flex", marginTop: px(22), fontSize: px(58), fontWeight: 800, lineHeight: 1.08, letterSpacing: -0.5 }}>{clip(view.car.title || view.car.regNumber, Math.round(44 * k))}</div>
              <div style={{ display: "flex", marginTop: px(18), fontSize: px(28), color: C.muted }}>{facts(view).join("  ·  ")}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: px(22), fontWeight: 700, letterSpacing: 2, color: C.subtle }}>{t.publicReport.score.toUpperCase()}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: px(14) }}>
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <span style={{ fontSize: px(150), fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>{view.scoreText}</span>
                  <span style={{ fontSize: px(40), fontWeight: 700, color: C.subtle }}>{t.publicReport.outOf}</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: px(6), marginBottom: px(22) }}>
                  {[40, 52, 64, 76, 88].map((h, i) => (
                    <div key={h} style={{ display: "flex", width: px(16), height: px(h), borderRadius: 3, background: i + 1 === filled ? C.olive : i < filled ? C.ink : C.border }} />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", fontSize: px(36), fontWeight: 700 }}>{t.publicReport.bands[view.band]}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <div style={{ display: "flex", flex: 1, fontSize: px(22), color: C.subtle }}>{t.disclaimer}</div>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page */}
            <img src={art.lockupSmall} alt="" width={px(200)} height={px(41)} />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers,
    },
  );
}
