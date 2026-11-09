import { describe, expect, it } from "vitest";
import { hi } from "@/lib/strings.hi";
import { sampleReportView } from "./sample";
import { applyHidden, redFlags } from "./view";

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
