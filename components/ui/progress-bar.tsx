/**
 * Accessible progress track (the brand's 4px track; `md` is 8px for a screen's main progress).
 * `label` names it for screen readers ("Photos taken"). Progress is olive: it is not a rating.
 */
export function ProgressBar({
  value,
  max,
  label,
  size = "md",
  className = "",
}: {
  value: number;
  max: number;
  label: string;
  size?: "sm" | "md";
  className?: string;
  /** @deprecated Progress is always the accent colour. */
  tone?: "brand" | "success";
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`overflow-hidden rounded-full bg-progress-track ${size === "sm" ? "h-[var(--progress-height)]" : "h-2"} ${className}`}
    >
      <div className="h-full rounded-full bg-progress-fill transition-[width] duration-[var(--dur-base)] ease-standard" style={{ width: `${pct}%` }} />
    </div>
  );
}
