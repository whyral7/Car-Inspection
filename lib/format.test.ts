import { describe, expect, it } from "vitest";
import { t } from "@/lib/strings";
import { carTitle, formatDate, isPastDate } from "./format";

describe("format", () => {
  it("formats a calendar date without shifting the day", () => {
    expect(formatDate("2027-03-31")).toBe("31 Mar 2027");
  });

  it("compares dates in Indian time", () => {
    // 20:00 UTC on 18 Oct is already 19 Oct in India.
    const now = new Date("2026-10-18T20:00:00Z");
    expect(isPastDate("2026-10-18", now)).toBe(true);
    expect(isPastDate("2026-10-19", now)).toBe(false);
  });

  it("builds a car title from what's known", () => {
    expect(carTitle({ year: 2019, make: "Honda", model: "City", variant: null })).toBe("2019 Honda City");
  });

  it.each([
    [1, "1st owner"],
    [2, "2nd owner"],
    [3, "3rd owner"],
    [4, "4th owner"],
    [11, "11th owner"],
  ])("owner ordinal %i", (n, expected) => {
    expect(t.cars.ownerOrdinal(n)).toBe(expected);
  });
});
