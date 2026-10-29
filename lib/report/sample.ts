import { CHECKLIST_KEYS, type ChecklistKey } from "@/lib/checklist";
import { ANGLE_KEYS } from "@/lib/photos/angles";
import { buildReportView, type ReportInput } from "./view";

// Made-up report for the landing page's "See a sample report". Built through the same buildReportView
// as real reports, so it always matches what buyers get. The sample has no real car, so line drawings
// of each angle (public/sample/*.svg) stand in for the 20 photos.

const notOk: Partial<Record<ChecklistKey, { result: "attention" | "fail"; note: string }>> = {
  spare_key: { result: "fail", note: "Only one key available." },
};

const sampleInput: ReportInput = {
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
    { type: "scratch", location: "Rear bumper, lower left", severity: "minor", note: "Surface scratch about 8 cm long, paint not broken through.", accepted: true, photo_id: "sample-rear" },
    { type: "scratch", location: "Front-left door", severity: "minor", note: "Light scuff near the handle.", accepted: true, photo_id: "sample-front_left" },
  ],
  price: {
    market_low_inr: 450_000,
    market_high_inr: 510_000,
    summary: "2019 Swift VXi petrol manuals with around 40,000 to 55,000 km are listed for ₹4.6 to 5.3 lakh in Pune, and usually sell a little below that.",
    comparables: [],
    searched_at: "2026-10-18T06:30:00.000Z",
  },
  checklist: CHECKLIST_KEYS.map((key) => ({ item_key: key, result: notOk[key]?.result ?? "ok", note: notOk[key]?.note ?? null })),
};

export function sampleReportView() {
  return buildReportView(sampleInput);
}
