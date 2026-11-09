import "server-only";
import { ImageResponse } from "next/og";
import { scoreBars } from "@/lib/score";
import { t } from "@/lib/strings";
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

/** `logo` is a data: URI (PNG or JPEG) or null, in which case the Treadmark symbol stands in. */
export async function reportOgImage(view: ReportView, logo: string | null, headers?: Record<string, string>) {
  const [fonts, art] = await assets;
  const filled = scoreBars(view.score);
  const dealerLine = [view.dealer.name, view.dealer.city].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.paper, fontFamily: "Martel Sans", color: C.ink, padding: "44px 56px 36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page */}
          <img src={logo ?? art.mark} alt="" width={72} height={72} style={{ borderRadius: 10, objectFit: "contain", border: logo ? `2px solid ${C.border}` : "none" }} />
          <div style={{ flex: 1, display: "flex", fontSize: 34, fontWeight: 700 }}>{clip(dealerLine, 40)}</div>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 2, color: C.subtle }}>{t.publicReport.heading.toUpperCase()}</div>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 40 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ display: "flex", border: `4px solid ${C.ink}`, borderRadius: 8, padding: "2px 16px", fontFamily: "IBM Plex Mono", fontSize: 42, fontWeight: 500, letterSpacing: 4 }}>
              {view.car.regNumber}
            </div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 58, fontWeight: 800, lineHeight: 1.08, letterSpacing: -0.5 }}>{clip(view.car.title || view.car.regNumber, 44)}</div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 28, color: C.muted }}>{facts(view).join("  ·  ")}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 2, color: C.subtle }}>{t.publicReport.score.toUpperCase()}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span style={{ fontSize: 150, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>{view.scoreText}</span>
                <span style={{ fontSize: 40, fontWeight: 700, color: C.subtle }}>{t.publicReport.outOf}</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 22 }}>
                {[40, 52, 64, 76, 88].map((h, i) => (
                  <div key={h} style={{ display: "flex", width: 16, height: h, borderRadius: 3, background: i + 1 === filled ? C.olive : i < filled ? C.ink : C.border }} />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>{t.publicReport.bands[view.band]}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 22, color: C.subtle, maxWidth: 820 }}>{t.disclaimer}</div>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page */}
          <img src={art.lockupSmall} alt="" width={200} height={41} />
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
