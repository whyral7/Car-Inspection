// Hex colours for the PDF and the link preview image, which can't use Tailwind classes.
// They match the Tailwind colours the web report uses.
import type { ScoreBand } from "@/lib/score";
import type { ChecklistResult, Severity } from "@/lib/supabase/database.types";

export const BRAND = { 700: "#115e59", 800: "#0b4542", 50: "#e6f4f2" } as const;
/** Number-plate yellow for the plate and score ring on buyer-facing reports. */
export const SIGNAL = { plate: "#ffc83d", ring: "#f5a400" } as const;
export const INK = { 900: "#0b1220", 700: "#334155", 500: "#64748b", 300: "#cbd5e1", 200: "#e2e8f0", 100: "#f1f5f9", 50: "#f8fafc" } as const;

type Chip = { fg: string; bg: string };

export const BAND_COLORS: Record<ScoreBand, Chip> = {
  good: { fg: "#047857", bg: "#d1fae5" },
  fair: { fg: "#b45309", bg: "#fef3c7" },
  poor: { fg: "#b91c1c", bg: "#fee2e2" },
};

export const SEVERITY_COLORS: Record<Severity, Chip> = {
  minor: { fg: "#78350f", bg: "#fef3c7" },
  moderate: { fg: "#7c2d12", bg: "#ffedd5" },
  major: { fg: "#991b1b", bg: "#fee2e2" },
};

export const RESULT_COLORS: Record<ChecklistResult, Chip> = {
  ok: { fg: "#065f46", bg: "#d1fae5" },
  attention: { fg: "#78350f", bg: "#fef3c7" },
  fail: { fg: "#991b1b", bg: "#fee2e2" },
  na: { fg: "#334155", bg: "#f1f5f9" },
};
