import { describe, expect, it } from "vitest";
import { conditionScore, formatScore } from "./score";
import type { ChecklistResult, Severity } from "@/lib/supabase/database.types";

const f = (severity: Severity, accepted = true) => ({ severity, accepted });
const c = (result: ChecklistResult) => ({ result });
const many = <T>(n: number, item: T) => Array.from({ length: n }, () => item);

describe("conditionScore", () => {
  it("starts at 10.0 with nothing found", () => {
    expect(conditionScore({ findings: [], checklist: [] })).toBe(10);
  });

  it("subtracts 0.3 / 0.8 / 1.5 per accepted minor / moderate / major finding", () => {
    expect(conditionScore({ findings: [f("minor")], checklist: [] })).toBe(9.7);
    expect(conditionScore({ findings: [f("moderate")], checklist: [] })).toBe(9.2);
    expect(conditionScore({ findings: [f("major")], checklist: [] })).toBe(8.5);
    expect(conditionScore({ findings: [f("minor"), f("moderate"), f("major")], checklist: [] })).toBe(7.4);
  });

  it("ignores findings the dealer hasn't accepted", () => {
    expect(conditionScore({ findings: [f("major", false), f("minor", false), f("minor")], checklist: [] })).toBe(9.7);
  });

  it("subtracts 0.3 per checklist attention and 1.0 per fail; ok and n/a cost nothing", () => {
    expect(conditionScore({ findings: [], checklist: [c("attention")] })).toBe(9.7);
    expect(conditionScore({ findings: [], checklist: [c("fail")] })).toBe(9);
    expect(conditionScore({ findings: [], checklist: [c("ok"), c("na"), c("ok")] })).toBe(10);
    expect(conditionScore({ findings: [f("moderate")], checklist: [c("attention"), c("fail")] })).toBe(7.9);
  });

  it("clamps at 1.0 however much is wrong", () => {
    expect(conditionScore({ findings: many(6, f("major")), checklist: [] })).toBe(1);
    expect(conditionScore({ findings: many(20, f("major")), checklist: many(19, c("fail")) })).toBe(1);
  });

  it("lands exactly on 1.0 at the boundary and just above it", () => {
    // 10 - 9 * 1.0 = 1.0 exactly; 10 - 8.9 = 1.1.
    expect(conditionScore({ findings: [], checklist: many(9, c("fail")) })).toBe(1);
    expect(conditionScore({ findings: [], checklist: [...many(8, c("fail")), ...many(3, c("attention"))] })).toBe(1.1);
  });

  it("never goes above 10.0", () => {
    expect(conditionScore({ findings: [f("major", false)], checklist: many(19, c("ok")) })).toBe(10);
  });

  it("rounds to one decimal without floating point drift", () => {
    // Naive floating point gives 10 - 0.3 * 7 = 7.8999999999999995 and 10 - 0.3 * 3 = 9.100000000000001.
    expect(conditionScore({ findings: many(7, f("minor")), checklist: [] })).toBe(7.9);
    expect(conditionScore({ findings: many(3, f("minor")), checklist: [] })).toBe(9.1);
    expect(conditionScore({ findings: many(11, f("minor")), checklist: many(2, c("attention")) })).toBe(6.1);
    for (let n = 0; n <= 30; n++) {
      // At most one digit after the point, e.g. "7.9", never "7.8999999999999995".
      expect(conditionScore({ findings: many(n, f("minor")), checklist: [] }).toString()).toMatch(/^\d+(\.\d)?$/);
    }
  });
});

describe("formatScore", () => {
  it("always shows one decimal", () => {
    expect(formatScore(10)).toBe("10.0");
    expect(formatScore(1)).toBe("1.0");
    expect(formatScore(7.9)).toBe("7.9");
  });
});
