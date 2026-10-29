import { describe, expect, it } from "vitest";
import { applyHidden, buildReportView, hiddenSectionsSchema, parseHiddenSections, summaryParts, type ReportInput } from "./view";

const input = (patch: Partial<ReportInput> = {}): ReportInput => ({
  slug: "k7m2p9xa4c",
  publishedAt: "2026-10-19T06:30:00Z",
  dealer: { user_type: "dealer", business_name: "Sharma Motors", owner_name: "Ravi Sharma", phone: "919876543210", city: "Pune", address: "FC Road", logoUrl: null },
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
  price: null,
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

  it("shows a dealer's business name, owner, address and logo", () => {
    const base = input();
    const view = buildReportView(input({ dealer: { ...base.dealer, logoUrl: "https://img/logo.png" } }), [], now);
    expect(view.dealer).toEqual({
      userType: "dealer",
      name: "Sharma Motors",
      ownerName: "Ravi Sharma",
      city: "Pune",
      address: "FC Road",
      phone: "919876543210",
      logoUrl: "https://img/logo.png",
    });
  });

  it("uses a dealer's own name when they haven't set a business name", () => {
    const base = input();
    const view = buildReportView(input({ dealer: { ...base.dealer, business_name: null } }), [], now);
    expect(view.dealer).toMatchObject({ name: "Ravi Sharma", ownerName: null });
  });

  it.each(["car_owner", "buyer"] as const)("shows only the person's name and city for a %s", (user_type) => {
    const base = input();
    // Leftover dealer details (e.g. after switching type) never reach the report.
    const view = buildReportView(input({ dealer: { ...base.dealer, user_type, logoUrl: "https://img/logo.png" } }), [], now);
    expect(view.dealer).toEqual({ userType: user_type, name: "Ravi Sharma", ownerName: null, city: "Pune", address: null, phone: "919876543210", logoUrl: null });
  });

  it("treats a profile from before user types as a dealer", () => {
    const base = input();
    const view = buildReportView(input({ dealer: { ...base.dealer, user_type: null } }), [], now);
    expect(view.dealer).toMatchObject({ userType: "dealer", name: "Sharma Motors" });
  });

  it("says who typed in the car details when they didn't come from the RC", () => {
    const base = input();
    const rcRow = (user_type: "dealer" | "car_owner" | "buyer") =>
      buildReportView(input({ dealer: { ...base.dealer, user_type }, car: { ...base.car, fromRc: false } }), [], now).documents?.rows[0].value;
    expect(rcRow("dealer")).toBe("Entered by the dealer");
    expect(rcRow("car_owner")).toBe("Entered by the owner");
    expect(rcRow("buyer")).toBe("Entered by hand");
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

describe("price estimate", () => {
  const price = {
    market_low_inr: 450_000,
    market_high_inr: 500_000,
    summary: "Similar Swifts ask 4.6 to 5.2 lakh.",
    comparables: [{ title: "2019 Swift VXi, 41,000 km", url: "https://www.cars24.com/buy-used-swift-1", price_inr: 489_000, year: 2019, km: 41_000 }],
    searched_at: "2026-10-19T06:30:00Z",
  };

  it("adjusts the market range for the live condition score", () => {
    const view = buildReportView(input({ price }));
    // The base fixture scores 6.6, a little below the 7.5 reference: 0.9 points x 2% = -1.8%.
    expect(view.scoreText).toBe("6.6");
    expect(view.price?.marketRangeText).toBe("₹4.5 lakh – ₹5 lakh");
    expect(view.price?.adjustmentText).toBe("−2%");
    expect(view.price?.rangeText).toBe("₹4.4 lakh – ₹4.9 lakh");
    expect(view.price?.comparables[0]).toMatchObject({ host: "cars24.com", priceText: "₹4.89 lakh" });
  });

  it("is null without an estimate and when the owner hides it", () => {
    expect(buildReportView(input()).price).toBeNull();
    expect(buildReportView(input({ price }), ["price"]).price).toBeNull();
    expect(hiddenSectionsSchema.parse(["price", "photos"])).toEqual(["photos", "price"]);
  });
});
