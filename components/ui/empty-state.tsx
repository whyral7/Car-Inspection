import type { ReactNode } from "react";

/**
 * What a list or screen shows when there's nothing in it yet: what it is, why it's empty and the one
 * thing to do next. `plain` drops the card for use inside another card.
 */
export function EmptyState({
  icon,
  title,
  body,
  children,
  plain,
  as: Heading = "h2",
}: {
  icon: ReactNode;
  title: string;
  body?: ReactNode;
  children?: ReactNode;
  plain?: boolean;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={`flex flex-col items-center px-6 py-8 text-center ${plain ? "" : "rounded-card bg-surface shadow-card"}`}>
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">{icon}</span>
      <Heading className="mt-4 text-heading">{title}</Heading>
      {body && <div className="mt-2 max-w-sm text-small text-ink-muted">{body}</div>}
      {children && <div className="mt-6 flex w-full max-w-xs flex-col gap-2">{children}</div>}
    </div>
  );
}
