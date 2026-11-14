import type { ComponentProps, ReactNode } from "react";
import { AlertIcon, ChevronDownIcon } from "@/components/icons";

// Brand TextField (brand/reference/components/TextField.md): a label above, the input, then one line of
// help or error below. 48px tall, 16px text so iOS doesn't zoom, a border-control edge (3:1). Reads only input-* tokens.
export const inputClass =
  "block min-h-[var(--input-height)] w-full rounded-md border border-input-border bg-input-bg px-[var(--input-padding-x)] text-input-fg transition-[border-color] [font:var(--input-font)] placeholder:text-input-placeholder hover:border-input-border-hover focus:border-input-border-focus disabled:bg-input-disabled-bg disabled:opacity-[var(--button-disabled-opacity)] aria-invalid:border-2 aria-invalid:border-input-border-error";

/** Registration and chassis numbers: mono, uppercase, spaced. Add autoCapitalize="characters". */
export const plateInputClass = "uppercase tracking-[var(--tracking-wide)] [font:var(--input-plate-font)] placeholder:normal-case placeholder:tracking-normal placeholder:[font:var(--input-font)]";

export function Label({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-[var(--field-gap)] flex items-baseline justify-between gap-2 type-label text-input-label">
      {children}
      {optional && <span className="type-caption text-input-help">{optional}</span>}
    </label>
  );
}

/** The line under a field: help, or the error written as the fix. */
export function FieldMessage({ id, error, hint }: { id?: string; error?: string; hint?: ReactNode }) {
  if (error) {
    return (
      <p id={id} className="mt-[var(--field-gap)] flex items-start gap-1.5 type-caption-strong text-input-error">
        <AlertIcon size={16} className="mt-px" />
        {error}
      </p>
    );
  }
  return hint ? <p className="mt-[var(--field-gap)] type-caption text-input-help">{hint}</p> : null;
}

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  prefix?: string;
  /** Unit shown inside the field on the right, in mono: km, mm, µm, V. */
  unit?: string;
  /** Sets the value like a number plate (mono, uppercase, spaced). */
  plate?: boolean;
  optional?: string;
} & Omit<ComponentProps<"input">, "name" | "prefix">;

/** Label, input, then a hint or an error. Pass `inputMode`, `autoComplete` and `enterKeyHint` so phones show the right keyboard. */
export function Field({ label, name, error, hint, prefix, unit, plate, optional, className, ...props }: FieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={name} optional={optional}>
        {label}
      </Label>
      <div className="flex items-stretch gap-2">
        {prefix && (
          <span className="flex min-h-[var(--input-height)] items-center rounded-md bg-surface-sunken px-[var(--input-padding-x)] type-reading text-text-muted">{prefix}</span>
        )}
        <span className="relative min-w-0 flex-1">
          <input
            id={name}
            name={name}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className={`${inputClass} ${plate ? plateInputClass : ""} ${unit ? "pr-12" : ""}`}
            {...props}
          />
          {unit && <span className="pointer-events-none absolute top-1/2 right-[var(--input-padding-x)] -translate-y-1/2 text-input-unit [font:var(--input-unit-font)]">{unit}</span>}
        </span>
      </div>
      <FieldMessage id={errorId} error={error} hint={hint} />
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  optional?: string;
} & Omit<ComponentProps<"select">, "name" | "children">;

export function SelectField({ label, name, options, placeholder, error, optional, className, ...props }: SelectFieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={name} optional={optional}>
        {label}
      </Label>
      <div className="relative">
        <select
          id={name}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={`${inputClass} appearance-none pr-10`}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon size={20} className="pointer-events-none absolute top-1/2 right-[var(--input-padding-x)] -translate-y-1/2 text-text-muted" />
      </div>
      <FieldMessage id={errorId} error={error} />
    </div>
  );
}

type TextAreaFieldProps = {
  label: string;
  name: string;
  error?: string;
  optional?: string;
} & Omit<ComponentProps<"textarea">, "name">;

export function TextAreaField({ label, name, error, optional, className, ...props }: TextAreaFieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={name} optional={optional}>
        {label}
      </Label>
      <textarea id={name} name={name} rows={2} aria-invalid={Boolean(error)} aria-describedby={errorId} className={`${inputClass} py-3`} {...props} />
      <FieldMessage id={errorId} error={error} />
    </div>
  );
}

/** Form-level error (server or network) shown above the submit button. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex animate-rise-in items-start gap-2 rounded-md bg-fail-tint px-4 py-3 type-label text-text">
      <AlertIcon size={18} className="mt-px text-fail" />
      <span>{message}</span>
    </p>
  );
}

/** After a failed submit, move focus (and the screen) to the first field with an error. */
export function focusFirstError(form: HTMLElement | null) {
  // Only controls: a radio group marks itself invalid too, but focus goes to its option.
  requestAnimationFrame(() => form?.querySelector<HTMLElement>(":is(input, select, textarea, button)[aria-invalid=true]")?.focus());
}
