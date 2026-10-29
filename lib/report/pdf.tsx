import "server-only";
import { join } from "node:path";
// Imported as PdfPicture: react-pdf images have no alt text, and the lint rule for <Image> expects one.
import { Document, Font, Image as PdfPicture, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { APP_NAME } from "@/lib/config";
import { formatPhone } from "@/lib/report/share";
import { en as t } from "@/lib/strings";
import { BAND_COLORS, BRAND, INK, RESULT_COLORS, SEVERITY_COLORS, SIGNAL } from "./colors";
import type { DetailRow, ReportCheckItem, ReportView } from "./view";

// The same layout as the public page, on A4: header, car and score, photos, damage notes, checklist,
// documents, disclaimer. Geist is bundled in assets/fonts (OFL) so the PDF looks the same everywhere.
Font.register({
  family: "Geist",
  fonts: [
    { src: join(process.cwd(), "assets/fonts/Geist-Regular.ttf"), fontWeight: 400 },
    { src: join(process.cwd(), "assets/fonts/Geist-Bold.ttf"), fontWeight: 700 },
  ],
});
// Don't split words like "Odometer" across lines.
Font.registerHyphenationCallback((word) => [word]);

export type PdfImage = { data: Buffer; format: "jpg" | "png" };

type Props = {
  view: ReportView;
  reportUrl: string;
  logo: PdfImage | null;
  /** Photo bytes by angle key. Photos without bytes are left out. */
  images: ReadonlyMap<string, PdfImage>;
};

const s = StyleSheet.create({
  // Don't set lineHeight on the page (or a wrapper): react-pdf then drops the fixed footer or spaces rows out.
  page: { paddingTop: 32, paddingBottom: 52, paddingHorizontal: 32, fontFamily: "Geist", fontSize: 9.5, color: INK[900] },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: INK[500] },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: INK[200] },
  logo: { width: 40, height: 40, objectFit: "contain", borderRadius: 6 },
  logoFallback: { width: 40, height: 40, borderRadius: 6, backgroundColor: BRAND[700], color: "#ffffff", fontSize: 18, fontWeight: 700, textAlign: "center", paddingTop: 9 },
  dealerName: { fontSize: 13, fontWeight: 700 },
  muted: { color: INK[500] },
  small: { fontSize: 8 },
  reportTag: { fontSize: 8, color: BRAND[700], fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 },
  hero: { flexDirection: "row", gap: 16, marginTop: 14 },
  heroPhoto: { width: 168, height: 126, objectFit: "cover", borderRadius: 6, backgroundColor: INK[100] },
  plate: { alignSelf: "flex-start", backgroundColor: SIGNAL.plate, borderWidth: 1.5, borderColor: INK[900], borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, fontSize: 12, fontWeight: 700, letterSpacing: 1.5 },
  carTitle: { fontSize: 17, fontWeight: 700, marginTop: 6 },
  details: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  detail: { width: "50%", flexDirection: "row", paddingVertical: 3, paddingRight: 10, borderBottomWidth: 0.5, borderBottomColor: INK[200] },
  detailLabel: { flex: 1, color: INK[500] },
  detailValue: { fontWeight: 700, textAlign: "right" },
  scoreBox: { width: 130, borderRadius: 8, padding: 12, alignItems: "center", justifyContent: "center" },
  scoreValue: { fontSize: 34, fontWeight: 700, lineHeight: 1 },
  section: { marginTop: 18 },
  sectionTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", fontSize: 12, fontWeight: 700, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: INK[900] },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  photoCell: { width: 172 },
  photo: { width: 172, height: 129, objectFit: "cover", borderRadius: 4, backgroundColor: INK[100] },
  photoLabel: { fontSize: 7.5, color: INK[700], marginTop: 2 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: INK[200] },
  chip: { fontSize: 7.5, fontWeight: 700, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1.5, width: 74, textAlign: "center" },
  groupTitle: { fontSize: 8, fontWeight: 700, color: INK[500], textTransform: "uppercase", letterSpacing: 0.6, marginTop: 8, marginBottom: 1 },
  disclaimer: { marginTop: 18, padding: 10, borderRadius: 6, backgroundColor: INK[100], fontWeight: 700, textAlign: "center" },
});

function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <View style={s.sectionTitle} minPresenceAhead={60}>
      <Text>{title}</Text>
      {aside ? <Text style={[s.small, s.muted, { fontWeight: 400 }]}>{aside}</Text> : null}
    </View>
  );
}

function Details({ rows }: { rows: DetailRow[] }) {
  return (
    <View style={s.details}>
      {rows.map((row) => (
        <View key={row.label} style={s.detail}>
          <Text style={s.detailLabel}>{row.label}</Text>
          <Text style={[s.detailValue, row.warn ? { color: SEVERITY_COLORS.major.fg } : {}]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

function CheckRow({ item }: { item: ReportCheckItem }) {
  const c = RESULT_COLORS[item.result];
  return (
    <View style={s.row} wrap={false}>
      <Text style={[s.chip, { color: c.fg, backgroundColor: c.bg }]}>{item.resultLabel}</Text>
      <View style={{ flex: 1 }}>
        <Text>{item.label}</Text>
        {item.note ? <Text style={[s.small, s.muted]}>{item.note}</Text> : null}
      </View>
    </View>
  );
}

export function ReportPdf({ view, reportUrl, logo, images }: Props) {
  const band = BAND_COLORS[view.band];
  const phone = formatPhone(view.dealer.phone);
  const place = [view.dealer.address, view.dealer.city].filter(Boolean).join(", ");
  const photos = view.photos?.filter((p) => images.has(p.key)) ?? null;
  // The first photo (normally the front) leads the report, as on the web page.
  const hero = photos?.[0] ? images.get(photos[0].key) : undefined;

  return (
    <Document
      title={`${view.car.regNumber} ${t.publicReport.heading}`}
      author={view.dealer.name}
      subject={`${view.car.title} ${t.publicReport.heading}`}
      creator={APP_NAME}
      producer={APP_NAME}
    >
      <Page size="A4" style={s.page}>
        <View style={s.footer} fixed>
          <Text>{t.disclaimer}</Text>
          <Text render={({ pageNumber, totalPages }) => t.publicReport.pdfPage(pageNumber, totalPages)} />
        </View>

        <View style={s.header}>
          {logo ? <PdfPicture src={logo} style={s.logo} /> : <Text style={s.logoFallback}>{view.dealer.name.charAt(0).toUpperCase()}</Text>}
          <View style={{ flex: 1 }}>
            <Text style={s.dealerName}>{view.dealer.name}</Text>
            {place ? <Text style={[s.small, s.muted]}>{place}</Text> : null}
            {phone ? <Text style={s.small}>{phone}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.reportTag}>{t.publicReport.heading}</Text>
            {view.publishedOn ? <Text style={[s.small, s.muted]}>{t.publicReport.publishedOn(view.publishedOn)}</Text> : null}
          </View>
        </View>

        <View style={s.hero}>
          {hero ? <PdfPicture src={hero} style={s.heroPhoto} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={s.plate}>{view.car.regNumber}</Text>
            <Text style={s.carTitle}>{view.car.title}</Text>
            <Details rows={view.car.details} />
          </View>
          <View style={[s.scoreBox, { backgroundColor: band.bg }]}>
            <Text style={[s.small, { color: band.fg, fontWeight: 700 }]}>{t.publicReport.score}</Text>
            <Text style={[s.scoreValue, { color: band.fg, marginTop: 4 }]}>{view.scoreText}</Text>
            <Text style={[s.small, { color: band.fg }]}>{t.publicReport.outOf}</Text>
            <Text style={{ color: band.fg, fontWeight: 700, marginTop: 4 }}>{t.publicReport.bands[view.band]}</Text>
          </View>
        </View>

        {view.price ? (
          <View style={s.section} wrap={false}>
            <SectionTitle title={t.publicReport.price} />
            <Text style={{ fontSize: 16, fontWeight: 700 }}>{view.price.rangeText}</Text>
            <Text style={[s.small, { color: INK[700], marginTop: 3 }]}>
              {view.price.adjusted
              ? t.publicReport.priceAdjusted(view.price.marketRangeText, view.price.adjustmentText, view.scoreText)
              : t.publicReport.priceUnadjusted(view.price.marketRangeText)}
            </Text>
            {view.price.summary ? <Text style={[s.small, { marginTop: 4 }]}>{view.price.summary}</Text> : null}
            <Text style={[s.small, s.muted, { marginTop: 6 }]}>{t.publicReport.priceBasedOn(view.price.comparables.length, view.price.searchedOn)}</Text>
            {view.price.comparables.map((c) => (
              <View key={c.url} style={[s.row, { paddingVertical: 3 }]}>
                <Link src={c.url} style={[s.small, { flex: 1, color: BRAND[700] }]}>
                  {c.title}
                  {` (${[c.host, c.detail].filter(Boolean).join(" · ")})`}
                </Link>
                {c.priceText ? <Text style={[s.small, { fontWeight: 700 }]}>{c.priceText}</Text> : null}
              </View>
            ))}
            <Text style={[s.small, s.muted, { marginTop: 6 }]}>{t.publicReport.priceDisclaimer}</Text>
          </View>
        ) : null}

        {photos && photos.length > 0 ? (
          <View style={s.section}>
            <SectionTitle title={t.publicReport.photos} aside={t.publicReport.photoCount(photos.length)} />
            <View style={s.photoGrid}>
              {photos.map((p) => (
                <View key={p.key} style={s.photoCell} wrap={false}>
                  <PdfPicture src={images.get(p.key)!} style={s.photo} />
                  <Text style={s.photoLabel}>{p.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {view.findings ? (
          <View style={s.section}>
            <SectionTitle title={t.publicReport.findings} aside={t.publicReport.findingCount(view.findings.length)} />
            {view.findings.length === 0 ? <Text style={s.muted}>{t.publicReport.noFindings}</Text> : null}
            {view.findings.map((f, i) => {
              const c = SEVERITY_COLORS[f.severity];
              return (
                <View key={i} style={s.row} wrap={false}>
                  <Text style={[s.chip, { color: c.fg, backgroundColor: c.bg }]}>{f.severityLabel}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 700 }}>
                      {f.typeLabel}
                      {f.location ? <Text style={{ fontWeight: 400 }}>{` · ${f.location}`}</Text> : null}
                    </Text>
                    {f.note ? <Text style={s.muted}>{f.note}</Text> : null}
                    {f.photoLabel ? <Text style={[s.small, s.muted]}>{t.publicReport.seenIn(f.photoLabel)}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {view.checklist ? (
          <View style={s.section}>
            <SectionTitle
              title={t.publicReport.checklist}
              aside={t.publicReport.checklistSummary(view.checklist.counts.ok, view.checklist.counts.attention, view.checklist.counts.fail)}
            />
            {view.checklist.groups.map((g) => (
              <View key={g.key}>
                <Text style={s.groupTitle} minPresenceAhead={30}>
                  {g.label}
                </Text>
                {g.items.map((item) => (
                  <CheckRow key={item.key} item={item} />
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {view.documents ? (
          <View style={s.section}>
            <SectionTitle title={t.publicReport.documents} />
            <Details rows={view.documents.rows} />
            {view.documents.items.map((item) => (
              <CheckRow key={item.key} item={item} />
            ))}
          </View>
        ) : null}

        <Text style={s.disclaimer} wrap={false}>
          {t.disclaimer}
        </Text>
        <Text style={[s.small, s.muted, { marginTop: 8, textAlign: "center" }]}>
          <Link src={reportUrl} style={{ color: BRAND[700] }}>
            {reportUrl}
          </Link>
          {` · ${t.publicReport.madeWith}`}
        </Text>
      </Page>
    </Document>
  );
}
