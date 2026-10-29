import { z } from "zod";
import { CHECKLIST_RESULTS, CHECKLIST_KEYS } from "@/lib/checklist";
import { FINDING_LIMITS, FINDING_TYPES, SEVERITIES } from "@/lib/findings";

// Error messages are keys into lib/strings.ts ("cars.errors.make"); show them with errorText() from lib/i18n.

const blankToNull = (v: unknown) => (typeof v === "string" ? v.trim() || null : (v ?? null));

/** A finding the dealer adds or edits. */
export const findingInputSchema = z.object({
  type: z.enum(FINDING_TYPES, "findings.errors.type"),
  severity: z.enum(SEVERITIES, "findings.errors.severity"),
  location: z
    .string("findings.errors.location")
    .trim()
    .min(1, "findings.errors.location")
    .max(FINDING_LIMITS.locationChars, "findings.errors.locationLong"),
  note: z.preprocess(blankToNull, z.string("findings.errors.note").max(FINDING_LIMITS.noteChars, "findings.errors.note").nullable()),
});

export type FindingField = keyof z.infer<typeof findingInputSchema>;

/** Highest reading we accept; anything above is a typo. */
export const MAX_ODOMETER_KM = 2_000_000;

export const odometerSchema = z.preprocess(
  (v) => (typeof v === "string" ? Number(v.replace(/[\s,]/g, "") || Number.NaN) : v),
  z.number("findings.errors.odometer").int("findings.errors.odometer").min(0, "findings.errors.odometer").max(MAX_ODOMETER_KM, "findings.errors.odometer"),
);

export const checklistItemSchema = z.object({
  item_key: z.enum(CHECKLIST_KEYS as [string, ...string[]]),
  result: z.enum(CHECKLIST_RESULTS),
  note: z.preprocess(blankToNull, z.string("checklist.errors.note").max(FINDING_LIMITS.noteChars, "checklist.errors.note").nullable()),
});
