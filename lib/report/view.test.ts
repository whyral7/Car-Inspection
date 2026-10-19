import { describe, expect, it } from "vitest";
import { applyHidden, buildReportView, hiddenSectionsSchema, parseHiddenSections, summaryParts, type ReportInput } from "./view";

const input = (patch: Partial<ReportInput> = {}): ReportInput => ({
  slug: "k7m2p9xa4c",
  publishedAt: "2026-10-19T06:30:00Z",
  dealer: { business_name: "Sharma Motors", owner_name: "Ravi Sharma", phone: "919876543210", city: "Pune", address: "FC Road", logoUrl: null },
  car: {
    reg_number: "MH12AB1234",
    make: "Maruti Suzuki",
    model: "Swift",
    variant: "VXI",
    fuel: "petrol",
    transmission: "manual",
    year: 2019,
    owners: 1,
    insurance_valid_upto: "2026-01-31",
    odometer_km: 45230,
    fromRc: true,
  },
  photos: [
    { id: "p-rear", angle_key: "rear", url: "https://img/rear.jpg", thumbUrl: null },
    { id: "p-front", angle_key: "front", url: "https://img/front.jpg", thumbUrl: "https://img/small/front.jpg" },
  ],
  findings: [
    { type: "scratch", location: "Rear bumper", severity: "minor", note: null, accepted: true, photo_id: "p-rear" },
    { type: "dent", location: "Bonnet", severity: "major", note: "Deep dent", accepted: true, photo_id: "p-front" },
    { type: "rust", location: "Door", severity: "moderate", note: null, accepted: false, photo_id: null },
    { type: "dent", location: "Front bumper", severity: "minor", note: "", accepted: true, photo_id: "p-front" },
  ],
  checklist: [
    { item_key: "engine_start", result: "ok", note: null },
    { item_key: "brakes", result: "attention", note: "Slight pull left" },
    { item_key: "ac_cooling", result: "fail", note: null },
    { item_key: "rc_original", result: "ok", note: null },
    { item_key: "spare_key", result: "na", note: null },
  ],
  ...patch,
});

const now = new Date("2026-10-19T12:00:00Z");

describe("buildReportView", () => {
  it("scores accepted notes and every checklist answer", () => {
    // 10 - 1.5 (major) - 0.3 - 0.3 (two minors) - 0.3 (attention) - 1.0 (fail) = 6.6
    const view = buildReportView(input(), [], now);
    expect(view.score).toBe(6.6);
    expect(view.scoreText).toBe("6.6");
    expect(view.band).toBe("fair");
  });

  it("shows only accepted notes, worst first, then in photo order", () => {
    const view = buildReportView(input(), [], now);
    expect(view.findings?.map((f) => [f.severity, f.location, f.photoLabel])).toEqual([
      ["major", "Bonnet", "Front"],
      ["minor", "Front bumper", "Front"],
      ["minor", "Rear bumper", "Rear"],
    ]);
    expect(view.findings?.[1].note).toBeNull();
  });

  it("orders photos by angle and falls back to the full photo when there's no small copy", () => {
    const view = buildReportView(input(), [], now);
    expect(view.photos?.map((p) => [p.key, p.thumbUrl])).toEqual([
      ["front", "https://img/small/front.jpg"],
      ["rear", "https://img/rear.jpg"],
    ]);
  });

  it("keeps document items out of the checklist and counts results", () => {
    const view = buildReportView(input(), [], now);
    expect(view.checklist?.groups.flatMap((g) => g.items.map((i) => i.key))).toEqual(["engine_start", "brakes", "ac_cooling"]);
    expect(view.checklist?.counts).toEqual({ ok: 1, attention: 1, fail: 1, na: 0 });
    expect(view.documents?.items.map((i) => i.key)).toEqual(["rc_original", "spare_key"]);
  });

  it("flags expired insurance in documents", () => {
    const view = buildReportView(input(), [], now);
    expect(view.documents?.rows.find((r) => r.warn)?.value).toMatch(/Expired/);
  });

  it("skips empty car details", () => {
    const base = input();
    const view = buildReportView(input({ car: { ...base.car, owners: null, odometer_km: null } }), [], now);
    expect(view.car.details.map((d) => d.label)).toEqual(["Fuel", "Transmission", "Year"]);
    expect(view.car.title).toBe("2019 Maruti Suzuki Swift VXI");
  });

  it("removes hidden sections but keeps the score", () => {
    const view = buildReportView(input(), ["photos", "findings"], now);
    expect(view.photos).toBeNull();
    expect(view.findings).toBeNull();
    expect(view.checklist).not.toBeNull();
    expect(view.score).toBe(6.6);
    expect(view.hidden).toEqual(["photos", "findings"]);
  });
});

describe("applyHidden", () => {
  it("can show a section again from the full view", () => {
    const full = buildReportView(input(), [], now);
    const hidden = applyHidden(full, ["documents"]);
    expect(hidden.documents).toBeNull();
    expect(applyHidden(full, []).documents).toEqual(full.documents);
  });
});

describe("hidden sections", () => {
  it("accepts known sections, dedupes and orders them", () => {
    expect(hiddenSectionsSchema.parse(["documents", "photos", "photos"])).toEqual(["photos", "documents"]);
    expect(hiddenSectionsSchema.safeParse(["prices"]).success).toBe(false);
  });

  it("ignores unknown values from the database", () => {
    expect(parseHiddenSections(["checklist", "old_section"])).toEqual(["checklist"]);
    expect(parseHiddenSections(null)).toEqual([]);
  });
});

describe("summaryParts", () => {
  it("only mentions shown sections", () => {
    const view = buildReportView(input(), ["checklist"], now);
    expect(summaryParts(view)).toEqual(["2 photos.", "3 damage notes."]);
  });
});
