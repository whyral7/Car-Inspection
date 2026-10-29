import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-sunken text-ink-muted",
  brand: "bg-brand-50 text-brand-800",
  success: "bg-success-50 text-success-800",
  warning: "bg-warning-50 text-warning-800",
  danger: "bg-danger-50 text-danger-800",
};

const dots: Record<BadgeTone, string> = {
  neutral: "bg-ink-subtle",
  brand: "bg-brand-600",
  success: "bg-success-600",
  warning: "bg-warning-500",
  danger: "bg-danger-600",
};

/** Small status label. `dot` adds a coloured dot so status isn't told by colour of text alone. */
export function Badge({
  tone = "neutral",
  dot,
  icon,
  children,
  className = "",
  label,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <span
      aria-label={label}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {dot && <span aria-hidden="true" className={`size-1.5 rounded-full ${dots[tone]}`} />}
      {icon}
      {children}
    </span>
  );
}
