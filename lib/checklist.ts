// The inspection checklist, in display order. Labels and hints live in lib/strings.ts.
import type { ChecklistResult } from "@/lib/supabase/database.types";

export const CHECKLIST_GROUPS = [
  { key: "engine", items: ["engine_start", "engine_noise", "exhaust_smoke", "clutch_gearbox", "brakes", "steering", "suspension_noise"] },
  { key: "electrical", items: ["ac_cooling", "power_windows", "lights", "horn", "battery"] },
  { key: "documents", items: ["rc_original", "insurance_valid", "puc_valid", "service_history", "spare_key"] },
  { key: "history", items: ["flood_signs", "accident_signs"] },
] as const;

export type ChecklistGroupKey = (typeof CHECKLIST_GROUPS)[number]["key"];
export type ChecklistKey = (typeof CHECKLIST_GROUPS)[number]["items"][number];

export const CHECKLIST_KEYS: readonly ChecklistKey[] = CHECKLIST_GROUPS.flatMap((g) => g.items);

/**
 * Checks a buyer relies on for safety or legality. "Mark the rest OK" never answers these: each one
 * needs a real look (or "Doesn't apply").
 */
export const MUST_ANSWER_KEYS = ["brakes", "steering", "flood_signs", "accident_signs", "rc_original", "insurance_valid"] as const satisfies readonly ChecklistKey[];

export function isMustAnswer(key: ChecklistKey) {
  return (MUST_ANSWER_KEYS as readonly string[]).includes(key);
}

export const CHECKLIST_RESULTS = ["ok", "attention", "fail", "na"] as const satisfies readonly ChecklistResult[];

export function isChecklistKey(value: string): value is ChecklistKey {
  return (CHECKLIST_KEYS as readonly string[]).includes(value);
}

/** How many checklist items have an answer (any result, including N/A). */
export function checklistProgress(answeredKeys: Iterable<string>) {
  const answered = new Set(answeredKeys);
  const done = CHECKLIST_KEYS.filter((k) => answered.has(k)).length;
  return { done, total: CHECKLIST_KEYS.length, complete: done === CHECKLIST_KEYS.length };
}
