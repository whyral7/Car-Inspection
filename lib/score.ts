import type { ChecklistResult, Severity } from "@/lib/supabase/database.types";

// Condition score rules from CLAUDE.md. Kept in tenths of a point so the maths is exact integers
// (10 - 0.3 * 7 in floating point is 7.8999…, in tenths it is 100 - 21 = 79).
const START = 100;
const MIN = 10;
const MAX = 100;
const FINDING_PENALTY: Record<Severity, number> = { minor: 3, moderate: 8, major: 15 };
const CHECKLIST_PENALTY: Record<ChecklistResult, number> = { ok: 0, attention: 3, fail: 10, na: 0 };

export type ScoreInput = {
  findings: readonly { severity: Severity; accepted: boolean }[];
  checklist: readonly { result: ChecklistResult }[];
};

/**
 * Start at 10. Subtract 0.3 / 0.8 / 1.5 per accepted minor / moderate / major finding, and
 * 0.3 per checklist "attention", 1.0 per "fail". Clamp to 1.0-10.0, round to one decimal.
 * Findings the dealer hasn't accepted don't count.
 */
export function conditionScore({ findings, checklist }: ScoreInput): number {
  let tenths = START;
  for (const f of findings) if (f.accepted) tenths -= FINDING_PENALTY[f.severity];
  for (const c of checklist) tenths -= CHECKLIST_PENALTY[c.result];
  const clamped = Math.min(MAX, Math.max(MIN, tenths));
  return Math.round(clamped) / 10;
}

/** "8.4" or "10.0": always one decimal, for display. */
export function formatScore(score: number) {
  return score.toFixed(1);
}

export type ScoreBand = "good" | "fair" | "poor";

/** Colour band for the score badge: 8.0 and up is good, 6.0 to 7.9 fair, below 6.0 needs work. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 8) return "good";
  if (score >= 6) return "fair";
  return "poor";
}
