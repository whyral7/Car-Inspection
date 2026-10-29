import type { ComponentProps, ReactNode } from "react";
import { AlertIcon } from "@/components/icons";

export const inputClass =
  "block min-h-12 w-full rounded-control border border-line-strong bg-surface px-4 text-body text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-subtle focus:border-brand-700 focus:shadow-focus focus:outline-none disabled:bg-sunken disabled:text-ink-muted aria-invalid:border-danger-700 aria-invalid:focus:shadow-[0_0_0_4px_var(--color-danger-50)]";

export function Label({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-baseline justify-between gap-2 text-small font-medium text-ink">
      {children}
      {optional && <span className="text-caption font-normal text-ink-subtle">{optional}</span>}
    </label>
  );
}

export function FieldMessage({ id, error, hint }: { id?: string; error?: string; hint?: ReactNode }) {
  if (error) {
    return (
      <p id={id} className="mt-2 flex items-start gap-1.5 text-small font-medium text-danger-700">
        <AlertIcon size={16} className="mt-0.5" />
        {error}
      </p>
    );
  }
  return hint ? <p className="mt-2 text-small text-ink-muted">{hint}</p> : null;
}

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  prefix?: string;
  optional?: string;
} & Omit<ComponentProps<"input">, "name" | "prefix">;

/** Label, input, then a hint or an error. Pass `inputMode`, `autoComplete` and `enterKeyHint` so phones show the right keyboard. */
export function Field({ label, name, error, hint, prefix, optional, className, ...props }: FieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={name} optional={optional}>
        {label}
      </Label>
      <div className="flex items-stretch gap-2">
        {prefix && (
          <span className="flex min-h-12 items-center rounded-control bg-sunken px-4 text-body font-medium text-ink-muted tabular">{prefix}</span>
        )}
        <input id={name} name={name} aria-invalid={Boolean(error)} aria-describedby={errorId} className={inputClass} {...props} />
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
        <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
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
    <p role="alert" className="flex animate-rise-in items-start gap-2 rounded-control bg-danger-50 px-4 py-3 text-small font-medium text-danger-800">
      <AlertIcon size={18} className="mt-px" />
      <span>{message}</span>
    </p>
  );
}

/** After a failed submit, move focus (and the screen) to the first field with an error. */
export function focusFirstError(form: HTMLElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
}
