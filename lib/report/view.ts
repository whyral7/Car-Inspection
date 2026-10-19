// The report as buyers see it. Built once from database rows and rendered by the public page, the
// dealer's preview, the PDF and the link preview image, so all four always agree.
import { z } from "zod";
import { FUELS, TRANSMISSIONS, type Fuel, type Transmission } from "@/lib/cars";
import { CHECKLIST_GROUPS, type ChecklistGroupKey, type ChecklistKey } from "@/lib/checklist";
import { formatDate, formatDateTime, carTitle, isPastDate } from "@/lib/format";
import { ANGLES, isAngleKey, type AngleKey } from "@/lib/photos/angles";
import { conditionScore, formatScore, scoreBand, type ScoreBand } from "@/lib/score";
import { t } from "@/lib/strings";
import type { CarRow, ChecklistResult, FindingRow, FindingType, Severity } from "@/lib/supabase/database.types";

export const REPORT_SECTIONS = ["photos", "findings", "checklist", "documents"] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

/** Hidden sections sent by the dealer: known names only, no repeats, always in section order. */
export const hiddenSectionsSchema = z
  .array(z.enum(REPORT_SECTIONS))
  .max(REPORT_SECTIONS.length)
  .transform((list) => REPORT_SECTIONS.filter((s) => list.includes(s)));

/** hidden_sections from the database, ignoring anything unknown. */
export function parseHiddenSections(value: readonly string[] | null | undefined): ReportSection[] {
  return REPORT_SECTIONS.filter((s) => value?.includes(s));
}

export type ReportInput = {
  slug: string | null;
  publishedAt: string | null;
  dealer: {
    business_name: string | null;
    owner_name: string | null;
    phone: string | null;
    city: string | null;
    address: string | null;
    logoUrl: string | null;
  };
  car: Pick<CarRow, "reg_number" | "make" | "model" | "variant" | "fuel" | "transmission" | "year" | "owners" | "insurance_valid_upto" | "odometer_km"> & {
    fromRc: boolean;
  };
  /** Photos with a working link; `thumbUrl` is the small copy when there is an up-to-date one. */
  photos: readonly { id: string; angle_key: string; url: string; thumbUrl: string | null }[];
  findings: readonly Pick<FindingRow, "type" | "location" | "severity" | "note" | "accepted" | "photo_id">[];
  checklist: readonly { item_key: string; result: ChecklistResult; note: string | null }[];
};

export type DetailRow = { label: string; value: string; warn?: boolean };
export type ReportPhoto = { key: AngleKey; label: string; url: string; thumbUrl: string };
export type ReportFinding = {
  type: FindingType;
  typeLabel: string;
  severity: Severity;
  severityLabel: string;
  location: string | null;
  note: string | null;
  photoLabel: string | null;
};
export type ReportCheckItem = { key: ChecklistKey; label: string; result: ChecklistResult; resultLabel: string; note: string | null };
export type ReportCheckGroup = { key: ChecklistGroupKey; label: string; items: ReportCheckItem[] };

export type ReportView = {
  slug: string | null;
  /** "19 Oct 2026", or null before the first publish. */
  publishedOn: string | null;
  dealer: { name: string; ownerName: string | null; city: string | null; address: string | null; phone: string | null; logoUrl: string | null };
  car: { regNumber: string; title: string; details: DetailRow[] };
  score: number;
  /** Always one decimal, e.g. "8.0". */
  scoreText: string;
  band: ScoreBand;
  hidden: ReportSection[];
  /** Each section is null when the dealer has hidden it. */
  photos: ReportPhoto[] | null;
  findings: ReportFinding[] | null;
  checklist: { groups: ReportCheckGroup[]; counts: Record<ChecklistResult, number> } | null;
  documents: { rows: DetailRow[]; items: ReportCheckItem[] } | null;
};

const SEVERITY_RANK: Record<Severity, number> = { major: 0, moderate: 1, minor: 2 };
const ANGLE_ORDER = new Map<string, number>(ANGLES.map((a, i) => [a.key, i]));

const isFuel = (v: string | null): v is Fuel => (FUELS as readonly string[]).includes(v ?? "");
const isTransmission = (v: string | null): v is Transmission => (TRANSMISSIONS as readonly string[]).includes(v ?? "");

function checkItem(key: ChecklistKey, row: ReportInput["checklist"][number]): ReportCheckItem {
  return { key, label: t.checklist.items[key].label, result: row.result, resultLabel: t.checklist.results[row.result], note: row.note || null };
}

/**
 * Builds the full report and then drops the hidden sections. The score always counts every accepted
 * note and checklist answer, hidden or not. Notes the dealer hasn't accepted never appear.
 */
export function buildReportView(input: ReportInput, hidden: readonly ReportSection[] = [], now = new Date()): ReportView {
  const { car, dealer } = input;

  const photos: ReportPhoto[] = input.photos
    .filter((p): p is typeof p & { angle_key: AngleKey } => isAngleKey(p.angle_key))
    .sort((a, b) => ANGLE_ORDER.get(a.angle_key)! - ANGLE_ORDER.get(b.angle_key)!)
    .map((p) => ({ key: p.angle_key, label: t.photos.angles[p.angle_key].label, url: p.url, thumbUrl: p.thumbUrl ?? p.url }));

  const angleByPhotoId = new Map(input.photos.map((p) => [p.id, p.angle_key]));
  const photoRank = (photoId: string | null) => ANGLE_ORDER.get(angleByPhotoId.get(photoId ?? "") ?? "") ?? ANGLES.length;
  const accepted = input.findings.filter((f) => f.accepted);
  const findings: ReportFinding[] = [...accepted]
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || photoRank(a.photo_id) - photoRank(b.photo_id))
    .map((f) => {
      const angle = angleByPhotoId.get(f.photo_id ?? "");
      return {
        type: f.type,
        typeLabel: t.findings.types[f.type],
        severity: f.severity,
        severityLabel: t.findings.severities[f.severity],
        location: f.location || null,
        note: f.note || null,
        photoLabel: angle && isAngleKey(angle) ? t.photos.angles[angle].label : null,
      };
    });

  const answers = new Map(input.checklist.map((c) => [c.item_key, c]));
  const groupItems = (keys: readonly ChecklistKey[]) =>
    keys.flatMap((key) => {
      const row = answers.get(key);
      return row ? [checkItem(key, row)] : [];
    });
  const groups: ReportCheckGroup[] = CHECKLIST_GROUPS.filter((g) => g.key !== "documents")
    .map((g) => ({ key: g.key, label: t.checklist.groups[g.key], items: groupItems(g.items) }))
    .filter((g) => g.items.length > 0);
  const counts: Record<ChecklistResult, number> = { ok: 0, attention: 0, fail: 0, na: 0 };
  for (const g of groups) for (const item of g.items) counts[item.result]++;

  const documentKeys = CHECKLIST_GROUPS.find((g) => g.key === "documents")?.items ?? [];
  const insuranceExpired = car.insurance_valid_upto ? isPastDate(car.insurance_valid_upto, now) : false;
  const documentRows: DetailRow[] = [{ label: t.publicReport.rcSource, value: car.fromRc ? t.publicReport.rcVerified : t.publicReport.rcManual }];
  if (car.insurance_valid_upto) {
    documentRows.push({
      label: t.publicReport.insurance,
      value: `${formatDate(car.insurance_valid_upto)}${insuranceExpired ? ` (${t.publicReport.expired})` : ""}`,
      warn: insuranceExpired,
    });
  }

  const detailCandidates: { label: string; value: string | null }[] = [
    { label: t.cars.fuel, value: isFuel(car.fuel) ? t.cars.fuels[car.fuel] : car.fuel },
    { label: t.cars.transmission, value: isTransmission(car.transmission) ? t.cars.transmissions[car.transmission] : car.transmission },
    { label: t.cars.year, value: car.year?.toString() ?? null },
    { label: t.cars.owners, value: car.owners ? t.cars.ownerOrdinal(car.owners) : null },
    { label: t.car.odometer, value: car.odometer_km !== null ? t.car.km(car.odometer_km) : null },
  ];
  const details = detailCandidates.filter((row): row is DetailRow => Boolean(row.value));

  const score = conditionScore({ findings: input.findings, checklist: input.checklist });

  const full: ReportView = {
    slug: input.slug,
    publishedOn: input.publishedAt ? formatDateTime(input.publishedAt) : null,
    dealer: {
      name: dealer.business_name ?? "",
      ownerName: dealer.owner_name,
      city: dealer.city,
      address: dealer.address,
      phone: dealer.phone,
      logoUrl: dealer.logoUrl,
    },
    car: { regNumber: car.reg_number, title: carTitle(car), details },
    score,
    scoreText: formatScore(score),
    band: scoreBand(score),
    hidden: [],
    photos,
    findings,
    checklist: { groups, counts },
    documents: { rows: documentRows, items: groupItems(documentKeys) },
  };
  return applyHidden(full, hidden);
}

/** Drops hidden sections. Used on the server for buyers, and in the browser for the live preview. */
export function applyHidden(view: ReportView, hidden: readonly ReportSection[]): ReportView {
  const isHidden = (s: ReportSection) => hidden.includes(s);
  return {
    ...view,
    hidden: REPORT_SECTIONS.filter(isHidden),
    photos: isHidden("photos") ? null : view.photos,
    findings: isHidden("findings") ? null : view.findings,
    checklist: isHidden("checklist") ? null : view.checklist,
    documents: isHidden("documents") ? null : view.documents,
  };
}

/** The short summary used in the link preview and page description, e.g. ["20 photos.", "3 damage notes."]. */
export function summaryParts(view: ReportView): string[] {
  const s = t.publicReport.summary;
  const parts: string[] = [];
  if (view.photos?.length) parts.push(s.photos(view.photos.length));
  if (view.findings) parts.push(s.findings(view.findings.length));
  if (view.checklist) parts.push(s.checklist(t.publicReport.checklistSummary(view.checklist.counts.ok, view.checklist.counts.attention, view.checklist.counts.fail)));
  return parts;
}
