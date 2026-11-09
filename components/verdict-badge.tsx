// Brand VerdictBadge (brand/reference/components/VerdictBadge.md): a word, a glyph and the verdict
// colour, never colour alone, never olive or sandstone. No hooks: renders on the server and in the browser.
import type { ReactNode } from "react";
import { AlertIcon, CheckIcon, CrossCircleIcon } from "@/components/icons";
import type { ChecklistResult, Severity } from "@/lib/supabase/database.types";

export type Verdict = "pass" | "attention" | "fail" | "na";

const tone: Record<Verdict, string> = {
  pass: "bg-verdict-pass-bg text-verdict-pass-fg",
  attention: "bg-verdict-attention-bg text-verdict-attention-fg",
  fail: "bg-verdict-fail-bg text-verdict-fail-fg",
  na: "bg-verdict-na-bg text-verdict-na-fg",
};

const glyph: Record<Verdict, ReactNode> = {
  pass: <CheckIcon size={14} />,
  attention: <AlertIcon size={14} />,
  fail: <CrossCircleIcon size={14} />,
  na: null,
};

/** Checklist answers and damage severities in verdict terms. */
export const resultVerdict: Record<ChecklistResult, Verdict> = { ok: "pass", attention: "attention", fail: "fail", na: "na" };
export const severityVerdict: Record<Severity, Verdict> = { minor: "attention", moderate: "attention", major: "fail" };

/** `children` is the word, already in the reader's language (e.g. t.checklist.results.ok). */
export function VerdictBadge({ verdict, children, className = "" }: { verdict: Verdict; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 type-caption-strong ${tone[verdict]} ${className}`}>
      {glyph[verdict]}
      {children}
    </span>
  );
}
