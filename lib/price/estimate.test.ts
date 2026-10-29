import { describe, expect, it } from "vitest";
import { adjustedRange, conditionFactor, roundPrice, submittedEstimateSchema, verifiedComparables } from "./estimate";

describe("conditionFactor", () => {
  it("is 1 at the reference score and moves 2% per point", () => {
    expect(conditionFactor(7.5)).toBe(1);
    expect(conditionFactor(8.5)).toBeCloseTo(1.02);
    expect(conditionFactor(5.5)).toBeCloseTo(0.96);
  });
  it("is capped at +5% and -15%", () => {
    expect(conditionFactor(10)).toBeCloseTo(1.05);
    expect(conditionFactor(1)).toBeCloseTo(0.87);
    expect(conditionFactor(-20)).toBe(0.85);
  });
});

describe("roundPrice", () => {
  it("rounds to a step that suits the price", () => {
    expect(roundPrice(462_300)).toBe(460_000);
    expect(roundPrice(1_234_567)).toBe(1_230_000);
    expect(roundPrice(7_830_000)).toBe(7_850_000);
    expect(roundPrice(1_000)).toBe(5_000);
  });
});

describe("adjustedRange", () => {
  it("lifts a well-kept car and lowers a rough one", () => {
    expect(adjustedRange(450_000, 500_000, 8.4)).toEqual({ low: 460_000, high: 510_000, factor: expect.closeTo(1.018) });
    expect(adjustedRange(450_000, 500_000, 4)).toMatchObject({ low: 420_000, high: 465_000 });
  });
  it("never returns high below low", () => {
    const r = adjustedRange(500_000, 500_000, 2);
    expect(r.high).toBeGreaterThanOrEqual(r.low);
  });
});

describe("submittedEstimateSchema", () => {
  const base = { enough_data: true, market_low_inr: 450_000, market_high_inr: 520_000, summary: "Most 2019 Swift VXi listings in Pune ask 4.5 to 5.2 lakh.", comparables: [] };
  it("accepts a sensible range", () => {
    expect(submittedEstimateSchema.safeParse(base).success).toBe(true);
  });
  it("rejects reversed, tiny or very wide ranges", () => {
    expect(submittedEstimateSchema.safeParse({ ...base, market_low_inr: 600_000 }).success).toBe(false);
    expect(submittedEstimateSchema.safeParse({ ...base, market_low_inr: 500, market_high_inr: 900 }).success).toBe(false);
    expect(submittedEstimateSchema.safeParse({ ...base, market_high_inr: 1_000_000 }).success).toBe(false);
  });
  it("allows zeros when there wasn't enough data", () => {
    expect(submittedEstimateSchema.safeParse({ ...base, enough_data: false, market_low_inr: 0, market_high_inr: 0 }).success).toBe(true);
  });
  it("rejects non-http links", () => {
    const bad = { ...base, comparables: [{ title: "x", url: "javascript:alert(1)", price_inr: null, year: null, km: null }] };
    expect(submittedEstimateSchema.safeParse(bad).success).toBe(false);
  });
});

describe("verifiedComparables", () => {
  const c = (url: string) => ({ title: "Listing", url, price_inr: 480_000, year: 2019, km: 42_000 });
  it("keeps only links seen in the search results, once each", () => {
    const seen = new Set(["https://www.cardekho.com/used-car-details/swift-1/", "https://www.cars24.com/buy-used-swift-2"]);
    const out = verifiedComparables([c("https://www.cardekho.com/used-car-details/swift-1"), c("https://made-up.example/listing"), c("https://www.cars24.com/buy-used-swift-2#photos"), c("https://www.cars24.com/buy-used-swift-2")], seen);
    expect(out.map((o) => o.url)).toEqual(["https://www.cardekho.com/used-car-details/swift-1", "https://www.cars24.com/buy-used-swift-2#photos"]);
  });
});
