import { describe, expect, it } from "vitest";
import { carDetailsSchema, isValidRegNumber, newCarSchema, normaliseRegNumber, regNumberSchema } from "./car";

describe("normaliseRegNumber", () => {
  it.each([
    ["mh 12 ab 1234", "MH12AB1234"],
    ["MH-12-AB-1234", "MH12AB1234"],
    [" dl3cab1234 ", "DL3CAB1234"],
    ["22 BH 1234 aa", "22BH1234AA"],
  ])("%s becomes %s", (raw, expected) => {
    expect(normaliseRegNumber(raw)).toBe(expected);
  });
});

describe("isValidRegNumber", () => {
  const now = new Date("2026-10-19T00:00:00Z");

  it.each(["MH12AB1234", "KA01MN9999", "DL3CAB1234", "DL10CA0001", "TN09B1234", "KA019999", "GJ5X1", "22BH1234AA", "21BH0001A", "27BH4321ZZ"])(
    "accepts %s",
    (reg) => {
      expect(isValidRegNumber(reg, now)).toBe(true);
    },
  );

  it.each([
    ["XX12AB1234", "unknown state"],
    ["MH00AB1234", "RTO 00"],
    ["MH12AB0000", "number 0000"],
    ["MH12ABCD1234", "four series letters"],
    ["MH12AB12345", "five digits"],
    ["MH12AB", "no number"],
    ["20BH1234AA", "BH before 2021"],
    ["35BH1234AA", "BH far in the future"],
    ["22BH123AA", "BH with 3 digits"],
    ["22BH1234", "BH without letters"],
    ["mh12ab1234", "lowercase (not normalised)"],
    ["", "empty"],
  ])("rejects %s (%s)", (reg) => {
    expect(isValidRegNumber(reg, now)).toBe(false);
  });
});

describe("regNumberSchema", () => {
  it("normalises then validates", () => {
    expect(regNumberSchema.parse("mh 12 ab 1234")).toBe("MH12AB1234");
    expect(regNumberSchema.safeParse("hello").success).toBe(false);
  });
});

describe("carDetailsSchema", () => {
  const valid = {
    make: " Maruti Suzuki ",
    model: "Swift",
    variant: "",
    fuel: "petrol",
    transmission: "",
    year: "2019",
    owners: "",
    insurance_valid_upto: "",
  };

  it("trims text and turns blanks into null", () => {
    expect(carDetailsSchema.parse(valid)).toEqual({
      make: "Maruti Suzuki",
      model: "Swift",
      variant: null,
      fuel: "petrol",
      transmission: null,
      year: 2019,
      owners: null,
      insurance_valid_upto: null,
    });
  });

  it("parses numbers and dates", () => {
    const out = carDetailsSchema.parse({ ...valid, owners: "2", insurance_valid_upto: "2027-03-31", transmission: "automatic" });
    expect(out).toMatchObject({ owners: 2, insurance_valid_upto: "2027-03-31", transmission: "automatic" });
  });

  it.each([
    ["make", " "],
    ["model", ""],
    ["fuel", "kerosene"],
    ["transmission", "semi"],
    ["year", ""],
    ["year", "1975"],
    ["year", "2099"],
    ["year", "20a9"],
    ["owners", "0"],
    ["owners", "1.5"],
    ["insurance_valid_upto", "31/03/2027"],
    ["insurance_valid_upto", "2027-02-30"],
  ])("rejects %s = %j", (field, value) => {
    const result = carDetailsSchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe(field);
  });
});

describe("newCarSchema", () => {
  const car = { make: "Honda", model: "City", year: 2018, reg_number: "mh12ab1234" };

  it("normalises the number and defaults rc_raw to null", () => {
    expect(newCarSchema.parse(car)).toMatchObject({ reg_number: "MH12AB1234", rc_raw: null });
  });

  it("rejects an oversized rc_raw", () => {
    expect(newCarSchema.safeParse({ ...car, rc_raw: { blob: "x".repeat(25_000) } }).success).toBe(false);
  });
});
