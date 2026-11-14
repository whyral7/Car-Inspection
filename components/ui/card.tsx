import Link from "next/link";
import type { ComponentProps, ElementType, ReactNode } from "react";
import { ChevronRightIcon } from "@/components/icons";

type Tone = "default" | "brand" | "success" | "warning" | "danger" | "muted";
type Padding = "none" | "sm" | "md" | "lg";

// Tints are for status and information only: accent-tint for an info banner or a selected row,
// the rating tints for a result. Tinted cards have no shadow, so they never read as raised.
const tones: Record<Tone, string> = {
  default: "bg-surface shadow-card",
  muted: "bg-surface-sunken",
  brand: "bg-accent-tint",
  success: "bg-pass-tint",
  warning: "bg-attention-tint",
  danger: "bg-fail-tint",
};

const paddings: Record<Padding, string> = { none: "", sm: "p-4", md: "p-4 sm:p-6", lg: "p-6 sm:p-8" };

export function cardClass(tone: Tone = "default", padding: Padding = "md", className = "") {
  return `rounded-lg ${tones[tone]} ${paddings[padding]} ${className}`;
}

/** The one surface in the app: a white card on the paper page, radius-lg, shadow-1. Tones are for status only. */
export function Card<T extends ElementType = "div">({
  as,
  tone = "default",
  padding = "md",
  className = "",
  ...props
}: { as?: T; tone?: Tone; padding?: Padding; className?: string } & Omit<ComponentProps<T>, "as" | "className">) {
  const Tag = (as ?? "div") as ElementType;
  return <Tag className={cardClass(tone, padding, className)} {...props} />;
}

/** Card title with an optional count or action on the right. */
export function CardHeader({ title, aside, description, as: Heading = "h2" }: { title: ReactNode; aside?: ReactNode; description?: ReactNode; as?: "h2" | "h3" }) {
  return (
    <div className="mb-4 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-4">
        <Heading className="type-heading-2">{title}</Heading>
        {aside && <div className="shrink-0 type-body-sm text-text-muted">{aside}</div>}
      </div>
      {description && <p className="type-body-sm text-text-muted">{description}</p>}
    </div>
  );
}

/** A card holding rows separated by hairlines (steps, settings, history). */
export function ListCard({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <ul aria-label={label} className={`divide-y divide-border overflow-hidden rounded-lg bg-surface shadow-card ${className}`}>
      {children}
    </ul>
  );
}

type RowProps = {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  highlight?: boolean;
  chevron?: boolean;
};

/** One row in a ListCard. With `href` or `onClick` the whole row is the tap target. */
export function ListRow({ leading, title, subtitle, trailing, href, onClick, highlight, chevron = Boolean(href || onClick) }: RowProps) {
  const inner = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block type-title-sm break-words">{title}</span>
        {subtitle && <span className="mt-0.5 block type-caption text-text-muted">{subtitle}</span>}
      </span>
      {trailing}
      {chevron && <ChevronRightIcon size={20} className="text-text-subtle" />}
    </>
  );
  const cls = `flex min-h-16 w-full items-center gap-4 px-4 py-4 text-left sm:px-6 ${highlight ? "bg-accent-tint" : ""}`;
  const interactive = "transition-colors hover:bg-surface-sunken active:bg-surface-sunken";
  return (
    <li>
      {href ? (
        <Link href={href} className={`${cls} ${interactive}`}>
          {inner}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={`${cls} ${interactive}`}>
          {inner}
        </button>
      ) : (
        <div className={cls}>{inner}</div>
      )}
    </li>
  );
}
