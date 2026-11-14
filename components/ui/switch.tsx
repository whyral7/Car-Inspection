"use client";

import { CheckIcon } from "@/components/icons";

/**
 * On/off setting with a 44px tap target. The label sits on the left; the whole row toggles.
 * Drawn as a checkbox (radius-sm, accent when on): the brand has no pill shapes outside progress tracks.
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-4 py-2 text-left disabled:opacity-[var(--button-disabled-opacity)]"
    >
      <span className="min-w-0">
        <span className="block type-title-sm">{label}</span>
        {description && <span className="block type-caption text-text-muted">{description}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`flex size-6 shrink-0 items-center justify-center rounded-sm border transition-[background-color,border-color] ${checked ? "border-accent bg-accent text-on-accent" : "border-border-control bg-surface text-transparent"}`}
      >
        <CheckIcon size={16} />
      </span>
    </button>
  );
}
