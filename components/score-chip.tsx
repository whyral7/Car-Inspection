import type { ScoreBand } from "@/lib/score";

/** Band colours shared by every score in the app and on reports: text and tint both pass 4.5:1. */
export const BAND_STYLE: Record<ScoreBand, { text: string; tint: string; ring: string; bar: string }> = {
  good: { text: "text-success-700", tint: "bg-success-50", ring: "ring-success-200", bar: "bg-success-600" },
  fair: { text: "text-warning-700", tint: "bg-warning-50", ring: "ring-warning-200", bar: "bg-warning-500" },
  poor: { text: "text-danger-700", tint: "bg-danger-50", ring: "ring-danger-200", bar: "bg-danger-600" },
};

/** Small "6.8/10" pill for lists. */
export function ScoreChip({ score, band, label }: { score: string; band: ScoreBand; label: string }) {
  const s = BAND_STYLE[band];
  return (
    <span aria-label={label} className={`inline-flex shrink-0 items-baseline rounded-chip px-2 py-0.5 text-small font-bold tabular ring-1 ring-inset ${s.text} ${s.tint} ${s.ring}`}>
      {score}
      <span className="text-caption font-semibold">/10</span>
    </span>
  );
}
