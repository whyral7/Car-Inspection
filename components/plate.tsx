/**
 * A registration number drawn like a number plate. Never truncated: at large text sizes it wraps
 * instead of being cut to one letter. `yellow` is the buyer-facing report style.
 */
export function Plate({ reg, size = "md", tone = "white", className = "" }: { reg: string; size?: "sm" | "md" | "lg"; tone?: "white" | "yellow"; className?: string }) {
  const sizes = { sm: "px-1.5 py-0.5 text-sm", md: "px-2 py-0.5 text-lg", lg: "px-2.5 py-1 text-2xl" };
  return (
    <span
      className={`inline-block max-w-full rounded-lg border-2 border-ink font-bold tracking-[0.08em] break-all tabular-nums ${tone === "yellow" ? "bg-[#ffc83d]" : "bg-white"} ${sizes[size]} ${className}`}
    >
      {reg}
    </span>
  );
}
