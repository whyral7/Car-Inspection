import { describe, expect, it } from "vitest";
import { normaliseFuel, normaliseTransmission } from "@/lib/cars";
import { carDetailsSchema, isValidRegNumber } from "@/lib/validation/car";
import { createMockProvider, isMockNotFound, mockRcDetails } from "./mock";
import { cleanMakerName, mapSurepassData, toIsoDate } from "./surepass";

const now = new Date("2026-10-19T06:00:00Z");

describe("mock RC provider", () => {
  it("returns the same car for the same number", () => {
    expect(mockRcDetails("MH12AB1234", now)).toEqual(mockRcDetails("MH12AB1234", now));
  });

  it("returns different cars for different numbers", () => {
    const models = new Set(["MH12AB1234", "KA01MN9999", "DL3CAB1234", "TN09BC4321", "GJ01XY5555", "UP16AA7777"].map((r) => mockRcDetails(r, now).model));
    expect(models.size).toBeGreaterThan(2);
  });

  it.each(["MH12AB1234", "KA01MN9999", "DL3CAB1234", "22BH1234AA", "26BH0042C"])("gives valid, plausible details for %s", (reg) => {
    const d = mockRcDetails(reg, now);
    // Whatever the mock returns must pass the same validation the save does.
    const parsed = carDetailsSchema.parse({ ...d, raw: undefined });
    expect(parsed.year).toBeLessThanOrEqual(2026);
    expect(d.owners).toBeGreaterThanOrEqual(1);
    expect(d.raw).toMatchObject({ source: "mock", rc_number: reg });
    expect(String(d.raw.registration_date) <= "2026-10-19").toBe(true);
  });

  it("uses the BH year as the registration year", () => {
    expect(mockRcDetails("23BH1234AA", now).year).toBe(2023);
  });

  it("treats ZZ series numbers as not on record", async () => {
    expect(isValidRegNumber("MH12ZZ1234") && isMockNotFound("MH12ZZ1234")).toBe(true);
    expect(isValidRegNumber("22BH1234ZZ") && isMockNotFound("22BH1234ZZ")).toBe(true);
    expect(isMockNotFound("MH12AZ1234")).toBe(false);
    expect(isMockNotFound("MH12AB1234")).toBe(false);
    const provider = createMockProvider({ delayMs: 0 });
    await expect(provider.lookup("MH12ZZ1234")).resolves.toBeNull();
    await expect(provider.lookup("MH12AB1234")).resolves.toMatchObject({ make: expect.any(String) });
  });
});

describe("surepass mapping", () => {
  it("maps a typical RC response", () => {
    const d = mapSurepassData({
      rc_number: "MH12AB1234",
      maker_description: "MARUTI SUZUKI INDIA LTD",
      maker_model: "SWIFT VXI AMT",
      fuel_type: "PETROL/CNG",
      manufacturing_date: "06/2018",
      registration_date: "2018-07-12",
      owner_number: "2",
      insurance_upto: "15-03-2027",
    });
    expect(d).toMatchObject({
      make: "Maruti Suzuki",
      model: "SWIFT VXI AMT",
      fuel: "petrol_cng",
      transmission: "automatic",
      year: 2018,
      owners: 2,
      insurance_valid_upto: "2027-03-15",
    });
    expect(d.raw.source).toBe("surepass");
  });

  it("leaves missing or junk fields null", () => {
    expect(mapSurepassData({ owner_number: "abc", insurance_upto: "soon" })).toMatchObject({
      make: null,
      model: null,
      fuel: null,
      transmission: null,
      year: null,
      owners: null,
      insurance_valid_upto: null,
    });
  });

  it.each([
    ["MAHINDRA & MAHINDRA LIMITED", "Mahindra & Mahindra"],
    ["TOYOTA KIRLOSKAR MOTOR PVT LTD", "Toyota"],
    ["TATA MOTORS LTD", "Tata"],
    ["HONDA CARS INDIA LTD.", "Honda"],
  ])("cleans maker %s", (raw, expected) => {
    expect(cleanMakerName(raw)).toBe(expected);
  });

  it.each([
    ["2027-03-31", "2027-03-31"],
    ["2027-03-31T00:00:00", "2027-03-31"],
    ["31/03/2027", "2027-03-31"],
    ["31-Mar-2027", null],
    [null, null],
  ])("toIsoDate(%j) = %j", (raw, expected) => {
    expect(toIsoDate(raw)).toBe(expected);
  });
});

describe("normalisers", () => {
  it.each([
    ["PETROL", "petrol"],
    ["DIESEL", "diesel"],
    ["CNG ONLY", "cng"],
    ["PETROL(CNG)", "petrol_cng"],
    ["ELECTRIC(BOV)", "electric"],
    ["PETROL/HYBRID", "hybrid"],
    ["PETROL/LPG", "lpg"],
    ["HYDROGEN", null],
  ])("fuel %s is %s", (raw, expected) => {
    expect(normaliseFuel(raw)).toBe(expected);
  });

  it.each([
    ["CITY VX CVT", "automatic"],
    ["CRETA SX AT", "automatic"],
    ["NEXON XZ MT", "manual"],
    ["SWIFT VXI", null],
  ])("transmission in %s is %s", (raw, expected) => {
    expect(normaliseTransmission(raw)).toBe(expected);
  });
});
