import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@/components/icons";

/** The "← Back to …" link at the top of a screen. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-11 items-center gap-2 self-start rounded-chip px-2 text-small font-semibold text-brand-700 transition-colors hover:bg-brand-50"
    >
      <ArrowLeftIcon size={18} />
      {children}
    </Link>
  );
}

type HeaderProps = {
  back?: { href: string; label: string };
  eyebrow?: ReactNode;
  title: ReactNode;
  /** One line under the title, e.g. the number plate and model. */
  meta?: ReactNode;
  description?: ReactNode;
  /** Right of the title on wide screens, under it on phones. */
  aside?: ReactNode;
  children?: ReactNode;
};

/** Top of every app screen: back link, title, one line of context and an optional explanation. */
export function PageHeader({ back, eyebrow, title, meta, description, aside, children }: HeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      {back && <BackLink href={back.href}>{back.label}</BackLink>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          {eyebrow && <p className="text-caption font-semibold tracking-wide text-brand-700 uppercase">{eyebrow}</p>}
          <h1 className="text-title break-words">{title}</h1>
          {meta && <div className="text-small text-ink-muted">{meta}</div>}
        </div>
        {aside}
      </div>
      {children}
      {description && <p className="max-w-prose text-small text-ink-muted">{description}</p>}
    </header>
  );
}

/**
 * Header for the four inspection steps (photos, damage notes, checklist, report): the same as
 * PageHeader plus "Step 2 of 4" and a segmented indicator, so people always know where they are.
 */
export function StepHeader({ step, labels, stepLabel, ...props }: HeaderProps & { step: number; labels: readonly string[]; stepLabel: string }) {
  return (
    <PageHeader eyebrow={stepLabel} {...props}>
      <ol aria-label={stepLabel} className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
        {labels.map((l, i) => (
          <li key={l} aria-current={i + 1 === step ? "step" : undefined} className="flex flex-col gap-1.5">
            <span className={`h-1 rounded-full transition-colors duration-200 ${i + 1 <= step ? "bg-brand-700" : "bg-sunken"}`} />
            <span className={`hidden text-caption sm:block ${i + 1 === step ? "font-semibold text-ink" : "text-ink-subtle"}`}>{l}</span>
            <span className="sr-only sm:hidden">{l}</span>
          </li>
        ))}
      </ol>
    </PageHeader>
  );
}
