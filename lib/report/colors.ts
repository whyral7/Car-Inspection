// Hex colours for the PDF and the link preview images, which can't read CSS variables.
// They are the Treadmark brand tokens resolved for the light theme (brand/tokens/treadmark-tokens.css).
// Change a colour there first, then here; brand style guide section 3.
import type { ChecklistResult, Severity } from "@/lib/supabase/database.types";

export const C = {
  paper: "#F6F4EF",
  white: "#FFFFFF",
  ink: "#1D1B24",
  muted: "#4A4753",
  subtle: "#66626F",
  border: "#E2DDD3",
  sunken: "#ECE8E0",
  olive: "#556B1F",
  oliveTint: "#EEF1E2",
  sandstone: "#D8C3A0",
} as const;

export type Verdict = "pass" | "attention" | "fail" | "na";
type Chip = { fg: string; bg: string; glyph: Verdict };

export const VERDICT_COLORS: Record<Verdict, { fg: string; bg: string }> = {
  pass: { fg: "#0F6E63", bg: "#E2F2EF" },
  attention: { fg: "#B23A0A", bg: "#FCEDE4" },
  fail: { fg: "#B42318", bg: "#FCE8E6" },
  na: { fg: C.muted, bg: C.sunken },
};

export const SEVERITY_COLORS: Record<Severity, Chip> = {
  minor: { ...VERDICT_COLORS.attention, glyph: "attention" },
  moderate: { ...VERDICT_COLORS.attention, glyph: "attention" },
  major: { ...VERDICT_COLORS.fail, glyph: "fail" },
};

export const RESULT_COLORS: Record<ChecklistResult, Chip> = {
  ok: { ...VERDICT_COLORS.pass, glyph: "pass" },
  attention: { ...VERDICT_COLORS.attention, glyph: "attention" },
  fail: { ...VERDICT_COLORS.fail, glyph: "fail" },
  na: { ...VERDICT_COLORS.na, glyph: "na" },
};
