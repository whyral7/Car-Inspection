import { z } from "zod";
import { CHECKLIST_RESULTS, CHECKLIST_KEYS } from "@/lib/checklist";
import { FINDING_LIMITS, FINDING_TYPES, SEVERITIES } from "@/lib/findings";
import { t } from "@/lib/strings";

const blankToNull = (v: unknown) => (typeof v === "string" ? v.trim() || null : (v ?? null));

/** A finding the dealer adds or edits. */
export const findingInputSchema = z.object({
  type: z.enum(FINDING_TYPES, t.findings.errors.type),
  severity: z.enum(SEVERITIES, t.findings.errors.severity),
  location: z
    .string(t.findings.errors.location)
    .trim()
    .min(1, t.findings.errors.location)
    .max(FINDING_LIMITS.locationChars, t.findings.errors.locationLong),
  note: z.preprocess(blankToNull, z.string(t.findings.errors.note).max(FINDING_LIMITS.noteChars, t.findings.errors.note).nullable()),
});

export type FindingField = keyof z.infer<typeof findingInputSchema>;

/** Highest reading we accept; anything above is a typo. */
export const MAX_ODOMETER_KM = 2_000_000;

export const odometerSchema = z.preprocess(
  (v) => (typeof v === "string" ? Number(v.replace(/[\s,]/g, "") || Number.NaN) : v),
  z.number(t.findings.errors.odometer).int(t.findings.errors.odometer).min(0, t.findings.errors.odometer).max(MAX_ODOMETER_KM, t.findings.errors.odometer),
);

export const checklistItemSchema = z.object({
  item_key: z.enum(CHECKLIST_KEYS as [string, ...string[]]),
  result: z.enum(CHECKLIST_RESULTS),
  note: z.preprocess(blankToNull, z.string(t.checklist.errors.note).max(FINDING_LIMITS.noteChars, t.checklist.errors.note).nullable()),
});
