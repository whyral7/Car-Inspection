import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@/components/icons";

/** The "← Back to …" link at the top of a screen. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-11 items-center gap-2 self-start rounded-sm px-2 type-label text-button-ghost-fg transition-colors hover:bg-button-ghost-bg-hover"
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
          {eyebrow && <p className="caps type-overline text-text-subtle">{eyebrow}</p>}
          <h1 className="type-heading-1 break-words">{title}</h1>
          {meta && <div className="type-body-sm text-text-muted">{meta}</div>}
        </div>
        {aside}
      </div>
      {children}
      {description && <p className="max-w-prose type-body-sm text-text-muted">{description}</p>}
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
            <span className={`h-[var(--progress-height)] rounded-2xs transition-colors ${i + 1 <= step ? "bg-progress-fill" : "bg-progress-track"}`} />
            <span className={`line-clamp-2 ${i + 1 === step ? "type-caption-strong text-text" : "type-caption text-text-subtle"}`}>{l}</span>
          </li>
        ))}
      </ol>
    </PageHeader>
  );
}
