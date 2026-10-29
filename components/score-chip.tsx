import type { ScoreBand } from "@/lib/score";

/** Band colours shared by every score in the app and on reports: text and tint both pass 4.5:1. */
export const BAND_STYLE: Record<ScoreBand, { text: string; tint: string; ring: string }> = {
  good: { text: "text-emerald-800", tint: "bg-emerald-50", ring: "ring-emerald-200" },
  fair: { text: "text-amber-800", tint: "bg-amber-50", ring: "ring-amber-200" },
  poor: { text: "text-red-800", tint: "bg-red-50", ring: "ring-red-200" },
};

/** Small "6.8" pill for lists. */
export function ScoreChip({ score, band, label }: { score: string; band: ScoreBand; label: string }) {
  const s = BAND_STYLE[band];
  return (
    <span aria-label={label} className={`inline-flex shrink-0 items-baseline rounded-lg px-2 py-0.5 text-sm font-bold ring-1 ${s.text} ${s.tint} ${s.ring}`}>
      {score}
      <span className="text-xs font-semibold">/10</span>
    </span>
  );
}
