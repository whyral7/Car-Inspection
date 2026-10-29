import type { BadgeTone } from "@/components/ui";
import type { Severity } from "@/lib/supabase/database.types";

/** How loud each damage severity is, everywhere it appears (review screen, report, PDF uses lib/report/colors). */
export const SEVERITY_TONE: Record<Severity, BadgeTone> = { minor: "neutral", moderate: "warning", major: "danger" };

/** Left edge of a finding card, so severity reads at a glance down a list. */
export const SEVERITY_EDGE: Record<Severity, string> = { minor: "before:bg-line-strong", moderate: "before:bg-warning-500", major: "before:bg-danger-600" };
