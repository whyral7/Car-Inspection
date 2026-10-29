// Finding vocabulary. Values are stored in the database; labels live in lib/strings.ts.
import type { FindingType, Severity } from "@/lib/supabase/database.types";

export const FINDING_TYPES = ["dent", "scratch", "rust", "repaint", "crack", "tyre_wear", "other"] as const satisfies readonly FindingType[];
export const SEVERITIES = ["minor", "moderate", "major"] as const satisfies readonly Severity[];

export const FINDING_LIMITS = {
  locationChars: 80,
  noteChars: 300,
} as const;
