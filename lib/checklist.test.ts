import { describe, expect, it } from "vitest";
import { CHECKLIST_KEYS, MUST_ANSWER_KEYS, checklistProgress, isChecklistKey, isMustAnswer } from "./checklist";

// Must match the item_key check constraint in supabase/migrations/20261019000000_init.sql.
const DB_KEYS = [
  "engine_start", "engine_noise", "exhaust_smoke", "ac_cooling", "power_windows", "brakes",
  "clutch_gearbox", "steering", "suspension_noise", "lights", "horn", "battery", "rc_original",
  "insurance_valid", "puc_valid", "service_history", "flood_signs", "accident_signs", "spare_key",
];

describe("checklist", () => {
  it("covers every item in CLAUDE.md exactly once", () => {
    expect([...CHECKLIST_KEYS].sort()).toEqual([...DB_KEYS].sort());
    expect(new Set(CHECKLIST_KEYS).size).toBe(CHECKLIST_KEYS.length);
  });

  it("recognises item keys", () => {
    expect(isChecklistKey("brakes")).toBe(true);
    expect(isChecklistKey("sunroof")).toBe(false);
  });

  it("counts answered items and ignores unknown keys", () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 19, complete: false });
    expect(checklistProgress(["brakes", "horn", "sunroof"])).toEqual({ done: 2, total: 19, complete: false });
    expect(checklistProgress(DB_KEYS)).toEqual({ done: 19, total: 19, complete: true });
  });
});

describe("must-answer checks", () => {
  it("covers the safety and legal checks, all real checklist items", () => {
    expect(MUST_ANSWER_KEYS).toEqual(expect.arrayContaining(["brakes", "flood_signs", "accident_signs", "rc_original"]));
    for (const key of MUST_ANSWER_KEYS) expect(CHECKLIST_KEYS).toContain(key);
    expect(isMustAnswer("horn")).toBe(false);
  });
});
