// Hex colours for the PDF and the link preview image, which can't use Tailwind classes.
// They mirror the design tokens in app/tokens.css; keep the two in step.
import type { ScoreBand } from "@/lib/score";
import type { ChecklistResult, Severity } from "@/lib/supabase/database.types";

export const BRAND = { 700: "#0f5e58", 800: "#0b4743", 50: "#e8f3f1" } as const;
/** ink (900), ink-muted (700), ink-subtle (500), line-strong (300), line (200), sunken (100), canvas (50). */
export const INK = { 900: "#0b1220", 700: "#475467", 500: "#5d6879", 300: "#858fa0", 200: "#e3e8ee", 100: "#eceff3", 50: "#f4f6f8" } as const;

type Chip = { fg: string; bg: string };

export const BAND_COLORS: Record<ScoreBand, Chip> = {
  good: { fg: "#067647", bg: "#ecfdf3" },
  fair: { fg: "#b54708", bg: "#fffaeb" },
  poor: { fg: "#b42318", bg: "#fef3f2" },
};

export const SEVERITY_COLORS: Record<Severity, Chip> = {
  minor: { fg: "#475467", bg: "#eceff3" },
  moderate: { fg: "#93370d", bg: "#fffaeb" },
  major: { fg: "#912018", bg: "#fef3f2" },
};

export const RESULT_COLORS: Record<ChecklistResult, Chip> = {
  ok: { fg: "#05603a", bg: "#ecfdf3" },
  attention: { fg: "#93370d", bg: "#fffaeb" },
  fail: { fg: "#912018", bg: "#fef3f2" },
  na: { fg: "#475467", bg: "#eceff3" },
};
