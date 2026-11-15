/**
 * A registration number as the brand's plate chip: IBM Plex Mono, tracked wide, a 1.5px ink outline.
 * Kept on one line: a plate is at most ten characters, so it fits a phone even at 200% text.
 */
export function Plate({ reg, size = "md", className = "" }: { reg: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = {
    sm: "min-h-[var(--plate-height)] px-[var(--plate-padding-x)] type-code-strong",
    md: "min-h-8 px-2.5 type-reading",
    lg: "min-h-10 px-3 [font:var(--input-plate-font)]",
  };
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-xs border-[length:var(--plate-border-width)] border-plate-border bg-surface tracking-[var(--tracking-wide)] whitespace-nowrap text-text ${sizes[size]} ${className}`}
    >
      {reg}
    </span>
  );
}
