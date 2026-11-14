import Link from "next/link";
import type { ComponentProps, ElementType, ReactNode } from "react";
import { ChevronRightIcon } from "@/components/icons";

type Tone = "default" | "brand" | "success" | "warning" | "danger" | "muted";
type Padding = "none" | "sm" | "md" | "lg";

const tones: Record<Tone, string> = {
  default: "bg-surface shadow-card",
  muted: "bg-sunken",
  brand: "bg-brand-50 ring-1 ring-inset ring-brand-100",
  success: "bg-success-50 ring-1 ring-inset ring-success-200",
  warning: "bg-warning-50 ring-1 ring-inset ring-warning-200",
  danger: "bg-danger-50 ring-1 ring-inset ring-danger-200",
};

const paddings: Record<Padding, string> = { none: "", sm: "p-4", md: "p-4 sm:p-6", lg: "p-6 sm:p-8" };

export function cardClass(tone: Tone = "default", padding: Padding = "md", className = "") {
  return `rounded-card ${tones[tone]} ${paddings[padding]} ${className}`;
}

/** The one surface in the app: white, rounded, a soft shadow and no border. Tones are for status only. */
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
        <Heading className="text-heading">{title}</Heading>
        {aside && <div className="shrink-0 text-small text-ink-muted">{aside}</div>}
      </div>
      {description && <p className="text-small text-ink-muted">{description}</p>}
    </div>
  );
}

/** A card holding rows separated by hairlines (steps, settings, history). */
export function ListCard({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <ul aria-label={label} className={`divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card ${className}`}>
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
        <span className="block font-medium break-words">{title}</span>
        {subtitle && <span className="mt-0.5 block text-small text-ink-muted">{subtitle}</span>}
      </span>
      {trailing}
      {chevron && <ChevronRightIcon size={20} className="text-ink-subtle" />}
    </>
  );
  const cls = `flex min-h-16 w-full items-center gap-4 px-4 py-4 text-left sm:px-6 ${highlight ? "bg-brand-50/60" : ""}`;
  const interactive = "transition-colors hover:bg-canvas active:bg-sunken";
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
