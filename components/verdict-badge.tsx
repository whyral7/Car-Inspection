// Brand VerdictBadge (brand/reference/components/VerdictBadge.md): a word, a glyph and the rating
// colour, never colour alone, never olive or sandstone. No hooks: renders on the server and in the browser.
import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { ChecklistResult, Severity } from "@/lib/supabase/database.types";

export type Verdict = "pass" | "attention" | "fail" | "na";

const tone: Record<Verdict, BadgeTone> = { pass: "success", attention: "warning", fail: "danger", na: "neutral" };

/** Checklist answers and damage severities in rating terms. */
export const resultVerdict: Record<ChecklistResult, Verdict> = { ok: "pass", attention: "attention", fail: "fail", na: "na" };
export const severityVerdict: Record<Severity, Verdict> = { minor: "attention", moderate: "attention", major: "fail" };

/** `children` is the word, already in the reader's language (e.g. t.checklist.results.ok). */
export function VerdictBadge({ verdict, children, className = "" }: { verdict: Verdict; children: ReactNode; className?: string }) {
  return (
    <Badge tone={tone[verdict]} className={className}>
      {children}
    </Badge>
  );
}
