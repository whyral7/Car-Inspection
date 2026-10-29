/**
 * A registration number drawn like an Indian number plate: white, dark border, wide letter spacing.
 * Never truncated: at large text sizes it wraps instead of being cut to one letter.
 */
export function Plate({ reg, size = "md", className = "" }: { reg: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "px-2 py-0.5 text-small", md: "px-2 py-0.5 text-heading", lg: "px-3 py-1 text-title" };
  return (
    <span
      className={`inline-block max-w-full rounded-chip bg-surface font-bold tracking-[0.08em] text-ink tabular ring-2 ring-ink ring-inset [overflow-wrap:anywhere] ${sizes[size]} ${className}`}
    >
      {reg}
    </span>
  );
}
