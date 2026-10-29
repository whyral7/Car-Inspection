/** Accessible progress bar. `label` names it for screen readers ("Photos taken"). */
export function ProgressBar({
  value,
  max,
  label,
  tone = "brand",
  size = "md",
  className = "",
}: {
  value: number;
  max: number;
  label: string;
  tone?: "brand" | "success";
  size?: "sm" | "md";
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`overflow-hidden rounded-full bg-sunken ${size === "sm" ? "h-1.5" : "h-2"} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-250 ease-standard ${tone === "success" || pct === 100 ? "bg-success-600" : "bg-brand-700"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
