import { describe, expect, it } from "vitest";
import { hi } from "@/lib/strings.hi";
import { sampleReportView } from "./sample";
import { applyHidden, dealerPlace, forPublic, maskReg, redFlags } from "./view";

describe("red flags", () => {
  it("lists failed checks and major damage above the score", () => {
    const flags = redFlags(sampleReportView());
    expect(flags.map((f) => f.title)).toContain("Spare key");
    expect(flags.find((f) => f.title === "Spare key")?.body).toBe("Only one key available.");
  });

  it("never shows a flag from a section the dealer hid", () => {
    const view = applyHidden(sampleReportView(), ["checklist", "documents", "findings"]);
    expect(redFlags(view)).toEqual([]);
  });

  it("uses the reader's language", () => {
    expect(redFlags(sampleReportView(hi)).map((f) => f.title)).toContain("दूसरी चाबी");
  });
});

describe("plate masking", () => {
  it("hides the middle of the number on anything public", () => {
    expect(maskReg("MH12AB1234")).toBe("MH12AB••34");
    expect(maskReg("DL3CAB1234")).toBe("DL3CAB••34");
    expect(forPublic(sampleReportView()).car.regNumber).not.toMatch(/1234/);
  });

  it("leaves very short numbers alone", () => {
    expect(maskReg("AB12")).toBe("AB12");
  });
});

describe("dealer place", () => {
  it("doesn't repeat the city when the address already has it", () => {
    expect(dealerPlace({ address: "Shop 12, Tonk Road, Jaipur 302015", city: "Jaipur" })).toBe("Shop 12, Tonk Road, Jaipur 302015");
    expect(dealerPlace({ address: "Shop 4, Baner Road", city: "Pune" })).toBe("Shop 4, Baner Road, Pune");
    expect(dealerPlace({ address: null, city: "Pune" })).toBe("Pune");
  });
});
