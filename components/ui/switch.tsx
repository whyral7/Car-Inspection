"use client";

/** On/off toggle with a 44px tap target. The label sits on the left; the whole row toggles. */
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
      className="flex min-h-14 w-full items-center justify-between gap-4 py-2 text-left disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-small text-ink-muted">{description}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-brand-700" : "bg-line-strong"}`}
      >
        <span
          className={`absolute top-1 left-1 size-5 rounded-full bg-surface shadow-card transition-transform duration-200 ease-standard ${checked ? "translate-x-5" : ""}`}
        />
      </span>
    </button>
  );
}
