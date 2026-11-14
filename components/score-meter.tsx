// Brand ScoreMeter (brand/reference/components/ScoreMeter.md): the score out of 10 in ink, five rising
// bars and the grade word. One scale everywhere; never coloured as a verdict, never stars.
// No hooks: renders on the server and inside client previews.
import type { ReactNode } from "react";
import { scoreBars } from "@/lib/score";

// Bar n is min + (n - 1) x step tall. Written out so Tailwind sees every class.
const BAR_HEIGHT = {
  lg: [
    "h-[var(--score-bar-min)]",
    "h-[calc(var(--score-bar-min)+var(--score-bar-step))]",
    "h-[calc(var(--score-bar-min)+2*var(--score-bar-step))]",
    "h-[calc(var(--score-bar-min)+3*var(--score-bar-step))]",
    "h-[var(--score-bar-height)]",
  ],
  // Compact meter for list rows: the same five bars at about half size.
  sm: ["h-2", "h-2.5", "h-3", "h-3.5", "h-4"],
} as const;

export function ScoreBars({ score, size = "lg", className = "" }: { score: number; size?: "lg" | "sm"; className?: string }) {
  const filled = scoreBars(score);
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-end ${size === "lg" ? "gap-[var(--score-bar-gap)]" : "gap-0.5"} ${className}`}>
      {BAR_HEIGHT[size].map((height, i) => (
        <span
          key={height}
          className={`${size === "lg" ? "w-[var(--score-bar-width)]" : "w-1"} rounded-2xs ${height} ${i + 1 === filled ? "bg-score-bar-tip" : i < filled ? "bg-score-bar-on" : "bg-score-bar"}`}
        />
      ))}
    </span>
  );
}

type MeterProps = {
  score: number;
  /** "8.4", already formatted with formatScore(). */
  scoreText: string;
  /** "/10" in the reader's language. */
  outOf: string;
  /** Grade word from scoreBand(), in the reader's language. */
  grade: string;
  /** One line of context under the grade, e.g. "2 amber flags, no red flags". */
  sub?: ReactNode;
  /** Spoken name: "Score 8.4 out of 10, very good". */
  label: string;
  className?: string;
};

/** Number, bars, then grade and one line of context. */
export function ScoreMeter({ score, scoreText, outOf, grade, sub, label, className = "" }: MeterProps) {
  return (
    <div role="img" aria-label={label} className={`flex items-end gap-[var(--score-gap)] ${className}`}>
      <span className="flex shrink-0 items-baseline tabular text-score-fg">
        <span className="tracking-[var(--score-tracking)] [font:var(--score-font)]">{scoreText}</span>
        <span className="text-score-sub [font:var(--score-unit-font)]">{outOf}</span>
      </span>
      <ScoreBars score={score} />
      <span className="flex min-w-0 flex-col pb-0.5">
        <span className="type-title-sm text-score-fg">{grade}</span>
        {sub && <span className="type-caption text-score-sub">{sub}</span>}
      </span>
    </div>
  );
}

/** "8.4/10" with small bars, for list rows. */
export function ScoreChip({ score, scoreText, outOf, label }: Pick<MeterProps, "score" | "scoreText" | "outOf" | "label">) {
  return (
    <span role="img" aria-label={label} className="inline-flex shrink-0 items-end gap-1.5 tabular text-score-fg">
      <span className="type-title-sm">
        {scoreText}
        <span className="type-caption-strong text-score-sub">{outOf}</span>
      </span>
      <ScoreBars score={score} size="sm" className="mb-0.5" />
    </span>
  );
}
