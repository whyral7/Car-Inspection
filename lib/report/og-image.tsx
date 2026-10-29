import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { en as t } from "@/lib/strings";
import { BAND_COLORS, BRAND, INK, SIGNAL } from "./colors";
import type { ReportView } from "./view";

// The link preview image WhatsApp shows above a shared report link: 1200x630 PNG, flat colours so it
// stays small (well under WhatsApp's ~300 KB limit).

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/Geist-Regular.ttf")),
  readFile(join(process.cwd(), "assets/fonts/Geist-Bold.ttf")),
]);

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

/** `logo` and `photo` are data: URIs (PNG or JPEG), or null: an initial-letter badge / no photo panel. */
export async function reportOgImage(view: ReportView, logo: string | null, photo: string | null, headers?: Record<string, string>) {
  const [regular, bold] = await fonts;
  const band = BAND_COLORS[view.band];
  const dealerLine = [view.dealer.name, view.dealer.city].filter(Boolean).join(" · ");
  // With a photo the text column is narrower, so titles are clipped sooner.
  const width = photo ? 0.62 : 1;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffffff", fontFamily: "Geist", color: INK[900] }}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page
          <img src={photo} alt="" width={456} height={630} style={{ objectFit: "cover" }} />
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ height: 14, background: BRAND[700], display: "flex" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: photo ? "32px 40px 28px" : "40px 56px 36px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by Satori, not a page
                <img src={logo} alt="" width={64} height={64} style={{ borderRadius: 12, objectFit: "contain", border: `2px solid ${INK[200]}` }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 12, background: BRAND[700], color: "#fff", fontSize: 34, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {view.dealer.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, display: "flex", fontSize: 30, fontWeight: 700 }}>{clip(dealerLine, Math.round(40 * width))}</div>
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 28 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ display: "flex", background: SIGNAL.plate, border: `4px solid ${INK[900]}`, borderRadius: 10, padding: "4px 14px", fontSize: 40, fontWeight: 700, letterSpacing: 4 }}>
                  {view.car.regNumber}
                </div>
                <div style={{ display: "flex", marginTop: 18, fontSize: photo ? 46 : 60, fontWeight: 700, lineHeight: 1.08 }}>{clip(view.car.title || view.car.regNumber, Math.round(44 * width))}</div>
                <div style={{ display: "flex", marginTop: 14, fontSize: 26, color: INK[500] }}>{facts(view).join("  ·  ")}</div>
              </div>
              <div
                style={{
                  width: photo ? 210 : 300,
                  height: photo ? 210 : 300,
                  borderRadius: 999,
                  background: band.bg,
                  border: `10px solid ${band.fg}`,
                  color: band.fg,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <span style={{ fontSize: photo ? 84 : 118, fontWeight: 700, lineHeight: 1 }}>{view.scoreText}</span>
                  <span style={{ fontSize: photo ? 30 : 40, fontWeight: 700, opacity: 0.75 }}>{t.publicReport.outOf}</span>
                </div>
                <div style={{ display: "flex", marginTop: 4, fontSize: photo ? 22 : 30, fontWeight: 700 }}>{t.publicReport.bands[view.band]}</div>
              </div>
            </div>

            <div style={{ display: "flex", fontSize: 20, color: INK[500] }}>{t.disclaimer}</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 700, style: "normal" },
      ],
      headers,
    },
  );
}
