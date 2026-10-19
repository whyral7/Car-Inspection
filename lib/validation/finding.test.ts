import { describe, expect, it } from "vitest";
import { checklistItemSchema, findingInputSchema, odometerSchema } from "./finding";

describe("findingInputSchema", () => {
  const valid = { type: "dent", severity: "minor", location: " Bonnet ", note: "  " };

  it("trims text and turns a blank note into null", () => {
    expect(findingInputSchema.parse(valid)).toEqual({ type: "dent", severity: "minor", location: "Bonnet", note: null });
  });

  it("requires a location and known type and severity", () => {
    expect(findingInputSchema.safeParse({ ...valid, location: "  " }).success).toBe(false);
    expect(findingInputSchema.safeParse({ ...valid, type: "smudge" }).success).toBe(false);
    expect(findingInputSchema.safeParse({ ...valid, severity: "severe" }).success).toBe(false);
  });

  it("limits text length", () => {
    expect(findingInputSchema.safeParse({ ...valid, location: "x".repeat(81) }).success).toBe(false);
    expect(findingInputSchema.safeParse({ ...valid, note: "x".repeat(301) }).success).toBe(false);
  });
});

describe("odometerSchema", () => {
  it("accepts plain and formatted kilometres", () => {
    expect(odometerSchema.parse("45230")).toBe(45230);
    expect(odometerSchema.parse("45,230")).toBe(45230);
    expect(odometerSchema.parse("1,23,456")).toBe(123456);
    expect(odometerSchema.parse(0)).toBe(0);
  });

  it("rejects blanks, decimals, negatives and absurd readings", () => {
    for (const v of ["", "abc", "12.5", "-3", "3000000"]) expect(odometerSchema.safeParse(v).success).toBe(false);
  });
});

describe("checklistItemSchema", () => {
  it("accepts a known item and result", () => {
    expect(checklistItemSchema.parse({ item_key: "brakes", result: "attention", note: " Pulls left " })).toEqual({
      item_key: "brakes",
      result: "attention",
      note: "Pulls left",
    });
  });

  it("rejects unknown items and results", () => {
    expect(checklistItemSchema.safeParse({ item_key: "sunroof", result: "ok" }).success).toBe(false);
    expect(checklistItemSchema.safeParse({ item_key: "brakes", result: "good" }).success).toBe(false);
  });
});
