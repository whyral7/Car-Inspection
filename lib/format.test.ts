import { describe, expect, it } from "vitest";
import { en as t } from "@/lib/strings";
import { carTitle, formatDate, formatInrShort, formatRupees, isPastDate } from "./format";

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

describe("formatRupees", () => {
  it("drops paise for whole rupees and keeps two decimals otherwise", () => {
    expect(formatRupees(99_900)).toBe("999");
    expect(formatRupees(249_900)).toBe("2,499");
    expect(formatRupees(10_000_000)).toBe("1,00,000");
    expect(formatRupees(8_330)).toBe("83.30");
  });
});

describe("formatInrShort", () => {
  it("uses lakh and crore like Indian car listings", () => {
    expect(formatInrShort(85_000)).toBe("₹85,000");
    expect(formatInrShort(460_000)).toBe("₹4.6 lakh");
    expect(formatInrShort(465_000)).toBe("₹4.65 lakh");
    expect(formatInrShort(500_000)).toBe("₹5 lakh");
    expect(formatInrShort(1_250_000)).toBe("₹12.5 lakh");
    expect(formatInrShort(12_500_000)).toBe("₹1.25 crore");
  });
});
