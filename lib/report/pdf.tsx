import "server-only";
// Imported as PdfPicture: react-pdf images have no alt text, and the lint rule for <Image> expects one.
import { Circle, Document, Font, Image as PdfPicture, Link, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { APP_NAME } from "@/lib/config";
import { formatPhone } from "@/lib/report/share";
import { scoreBars } from "@/lib/score";
import { t } from "@/lib/strings";
import { FONT_FILES, PDF_ART } from "./brand-assets";
import { C, RESULT_COLORS, SEVERITY_COLORS, VERDICT_COLORS, type Verdict } from "./colors";
import { redFlags, type DetailRow, type ReportCheckItem, type ReportView } from "./view";

// The same layout as the public page, on A4 Paper: header, car and score, photos, damage notes, checklist,
// documents, disclaimer, seal. Treadmark brand: Martel Sans for text, IBM Plex Mono for plates, readings and prices.
Font.register({
  family: "Martel Sans",
  fonts: [
    { src: FONT_FILES.regular, fontWeight: 400 },
    { src: FONT_FILES.semibold, fontWeight: 600 },
    { src: FONT_FILES.bold, fontWeight: 700 },
    { src: FONT_FILES.extrabold, fontWeight: 800 },
  ],
});
Font.register({
  family: "IBM Plex Mono",
  fonts: [
    { src: FONT_FILES.mono, fontWeight: 400 },
    { src: FONT_FILES.monoMedium, fontWeight: 500 },
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

const MONO = "IBM Plex Mono";
const s = StyleSheet.create({
  // Don't set lineHeight on the page (or a wrapper): react-pdf then drops the fixed footer or spaces rows out.
  page: { paddingTop: 32, paddingBottom: 52, paddingHorizontal: 32, fontFamily: "Martel Sans", fontSize: 9.5, color: C.ink, backgroundColor: C.paper },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.subtle },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  logo: { width: 40, height: 40, objectFit: "contain", borderRadius: 6 },
  // Small lockup: 1820 x 373 artwork, shown 120pt wide (35 mm, the brand minimum for the full lockup is met).
  lockup: { width: 120, height: 24.6 },
  dealerName: { fontSize: 13, fontWeight: 700 },
  muted: { color: C.subtle },
  small: { fontSize: 8 },
  mono: { fontFamily: MONO, fontWeight: 500 },
  reportTag: { fontSize: 7, color: C.subtle, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.56 },
  hero: { flexDirection: "row", gap: 16, marginTop: 14 },
  plate: { alignSelf: "flex-start", borderWidth: 1.5, borderColor: C.ink, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: 1.2 },
  carTitle: { fontSize: 18, fontWeight: 700, marginTop: 6 },
  details: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  detail: { width: "50%", flexDirection: "row", paddingVertical: 3, paddingRight: 10, borderBottomWidth: 0.5, borderBottomColor: C.border },
  detailLabel: { flex: 1, color: C.subtle },
  detailValue: { fontWeight: 600, textAlign: "right" },
  scoreBox: { width: 130, alignItems: "flex-end" },
  scoreValue: { fontSize: 34, fontWeight: 800, lineHeight: 1, letterSpacing: -0.6 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 2, marginLeft: 6, marginBottom: 3 },
  section: { marginTop: 18 },
  sectionTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", fontSize: 12, fontWeight: 700, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: C.ink },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  photoCell: { width: 172 },
  photo: { width: 172, height: 129, objectFit: "cover", borderRadius: 4, backgroundColor: C.sunken },
  photoLabel: { fontSize: 7.5, color: C.muted, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.border },
  chip: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, width: 66 },
  chipText: { fontSize: 7.5, fontWeight: 600 },
  groupTitle: { fontSize: 7, fontWeight: 600, color: C.subtle, textTransform: "uppercase", letterSpacing: 0.56, marginTop: 8, marginBottom: 1 },
  disclaimer: { marginTop: 18, padding: 10, borderRadius: 6, backgroundColor: C.sunken, fontWeight: 600, textAlign: "center" },
  signoff: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  seal: { width: 64, height: 64 },
  flag: { flexDirection: "row", gap: 8, padding: 8, borderRadius: 6, backgroundColor: VERDICT_COLORS.fail.bg, marginTop: 4 },
});

/** Verdict glyph (tick, triangle alert, cross in circle): every verdict carries a word and a glyph, never colour alone. */
function Glyph({ kind, color }: { kind: Verdict; color: string }) {
  if (kind === "na") return null;
  return (
    <Svg width={8} height={8} viewBox="0 0 24 24">
      {kind === "pass" ? <Path d="M4.5 12.5l4.5 4.5L19.5 7" stroke={color} strokeWidth={3} fill="none" strokeLinecap="square" /> : null}
      {kind === "attention" ? <Path d="M12 3.5L21.5 20H2.5z M12 10v4.5 M12 17v.5" stroke={color} strokeWidth={2.6} fill="none" /> : null}
      {kind === "fail" ? (
        <>
          <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2.6} fill="none" />
          <Path d="M9 9l6 6M15 9l-6 6" stroke={color} strokeWidth={2.6} strokeLinecap="square" />
        </>
      ) : null}
    </Svg>
  );
}

function VerdictChip({ chip, label }: { chip: { fg: string; bg: string; glyph: Verdict }; label: string }) {
  return (
    <View style={[s.chip, { backgroundColor: chip.bg }]}>
      <Glyph kind={chip.glyph} color={chip.fg} />
      <Text style={[s.chipText, { color: chip.fg }]}>{label}</Text>
    </View>
  );
}

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
  return (
    <View style={s.row} wrap={false}>
      <VerdictChip chip={RESULT_COLORS[item.result]} label={item.resultLabel} />
      <View style={{ flex: 1 }}>
        <Text>{item.label}</Text>
        {item.note ? <Text style={[s.small, s.muted]}>{item.note}</Text> : null}
      </View>
    </View>
  );
}

export function ReportPdf({ view, reportUrl, logo, images }: Props) {
  const filled = scoreBars(view.score);
  const phone = formatPhone(view.dealer.phone);
  const place = [view.dealer.address, view.dealer.city].filter(Boolean).join(", ");
  const photos = view.photos?.filter((p) => images.has(p.key)) ?? null;
  const flags = redFlags(view);

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
          {logo ? <PdfPicture src={logo} style={s.logo} /> : <PdfPicture src={PDF_ART.lockupSmall} style={s.lockup} />}
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
          <View style={{ flex: 1 }}>
            <Text style={s.plate}>{view.car.regNumber}</Text>
            <Text style={s.carTitle}>{view.car.title}</Text>
            <Details rows={view.car.details} />
          </View>
          <View style={s.scoreBox}>
            <Text style={s.reportTag}>{t.publicReport.score}</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 4 }}>
              <Text style={s.scoreValue}>{view.scoreText}</Text>
              <Text style={[s.muted, { fontSize: 11, marginBottom: 3 }]}>{t.publicReport.outOf}</Text>
              <View style={s.bars}>
                {[9, 11.5, 14, 16.5, 19].map((h, i) => (
                  <View key={h} style={{ width: 4, height: h, borderRadius: 1, backgroundColor: i + 1 === filled ? C.olive : i < filled ? C.ink : C.border }} />
                ))}
              </View>
            </View>
            <Text style={{ fontWeight: 700, marginTop: 4 }}>{t.publicReport.bands[view.band]}</Text>
          </View>
        </View>

        {flags.length > 0 ? (
          <View style={s.section} wrap={false}>
            <Text style={s.reportTag}>{t.publicReport.flagsTitle(flags.length)}</Text>
            {flags.map((flag) => (
              <View key={flag.key} style={s.flag}>
                <Glyph kind="fail" color={VERDICT_COLORS.fail.fg} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 700 }}>{flag.title}</Text>
                  {flag.body ? <Text style={{ color: C.muted }}>{flag.body}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {view.price ? (
          <View style={s.section} wrap={false}>
            <SectionTitle title={t.publicReport.price} />
            <Text style={[s.mono, { fontSize: 15 }]}>{view.price.rangeText}</Text>
            <Text style={[s.small, { color: C.muted, marginTop: 3 }]}>
              {view.price.adjusted
              ? t.publicReport.priceAdjusted(view.price.marketRangeText, view.price.adjustmentText, view.scoreText)
              : t.publicReport.priceUnadjusted(view.price.marketRangeText)}
            </Text>
            {view.price.summary ? <Text style={[s.small, { marginTop: 4 }]}>{view.price.summary}</Text> : null}
            <Text style={[s.small, s.muted, { marginTop: 6 }]}>{t.publicReport.priceBasedOn(view.price.comparables.length, view.price.searchedOn)}</Text>
            {view.price.comparables.map((c) => (
              <View key={c.url} style={[s.row, { paddingVertical: 3 }]}>
                <Link src={c.url} style={[s.small, { flex: 1, color: C.olive }]}>
                  {c.title}
                  {` (${[c.host, c.detail].filter(Boolean).join(" · ")})`}
                </Link>
                {c.priceText ? <Text style={[s.small, s.mono]}>{c.priceText}</Text> : null}
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
              return (
                <View key={i} style={s.row} wrap={false}>
                  <VerdictChip chip={SEVERITY_COLORS[f.severity]} label={f.severityLabel} />
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
        <View style={s.signoff} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={[s.small, s.muted]}>{t.publicReport.inspectedBy}</Text>
            <Text style={{ fontWeight: 700 }}>{view.dealer.name}</Text>
            <Text style={[s.small, s.muted, { marginTop: 4 }]}>
              <Link src={reportUrl} style={{ color: C.olive }}>
                {reportUrl}
              </Link>
              {` · ${t.publicReport.madeWith}`}
            </Text>
          </View>
          <PdfPicture src={PDF_ART.seal} style={s.seal} />
        </View>
      </Page>
    </Document>
  );
}
