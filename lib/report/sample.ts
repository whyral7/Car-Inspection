import { CHECKLIST_KEYS, type ChecklistKey } from "@/lib/checklist";
import { ANGLE_KEYS } from "@/lib/photos/angles";
import { en, type Strings } from "@/lib/strings";
import { buildReportView, forPublic, type ReportInput } from "./view";

// Made-up report for the landing page's "See a sample report". Built through the same buildReportView
// as real reports, so it always matches what buyers get. The sample has no real car, so line drawings
// of each angle (public/sample/*.svg) stand in for the 20 photos.

// The sample's own words (notes, places on the car) come from the strings, so a Hindi reader sees a Hindi sample.
const sampleInput = (t: Strings): ReportInput => {
  const d = t.sampleReport.data;
  const notOk: Partial<Record<ChecklistKey, { result: "attention" | "fail"; note: string }>> = {
    spare_key: { result: "fail", note: d.spareKey },
  };
  return {
    slug: null,
    publishedAt: "2026-10-18T06:30:00.000Z",
    dealer: {
      user_type: "dealer",
      business_name: "Sharma Motors",
      owner_name: "Rajesh Sharma",
      phone: null, // no contact buttons on the sample
      city: "Pune",
      address: "Baner Road, Pune",
      logoUrl: null,
    },
    car: {
      reg_number: "MH12AB1234",
      make: "Maruti Suzuki",
      model: "Swift",
      variant: "VXi",
      fuel: "petrol",
      transmission: "manual",
      year: 2019,
      owners: 1,
      insurance_valid_upto: "2027-03-31",
      odometer_km: 48_250,
      status: "published",
      fromRc: true,
    },
    photos: ANGLE_KEYS.map((key) => ({ id: `sample-${key}`, angle_key: key, url: `/sample/${key}.svg`, thumbUrl: `/sample/${key}.svg`, takenAt: "2026-10-18T06:05:00.000Z" })),
    findings: [
      { type: "scratch", ...d.scratchRear, severity: "minor", accepted: true, photo_id: "sample-rear" },
      { type: "scratch", ...d.scuffDoor, severity: "minor", accepted: true, photo_id: "sample-front_left" },
    ],
    price: {
      market_low_inr: 450_000,
      market_high_inr: 510_000,
      summary: d.price,
      comparables: [],
      searched_at: "2026-10-18T06:30:00.000Z",
    },
    checklist: CHECKLIST_KEYS.map((key) => ({ item_key: key, result: notOk[key]?.result ?? "ok", note: notOk[key]?.note ?? null })),
  };
};

export function sampleReportView(t: Strings = en) {
  return forPublic(buildReportView(sampleInput(t), [], undefined, t));
}
