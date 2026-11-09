import type { ComponentProps, ReactNode } from "react";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  prefix?: string;
} & Omit<ComponentProps<"input">, "name" | "prefix">;

// Brand TextField spec (brand/reference/components/TextField.md): 48px, 16px text, 3:1 edge, 2px error edge.
export const inputClass =
  "block min-h-12 w-full rounded-md border border-input-border bg-input-bg px-4 type-body text-input-fg placeholder:text-input-placeholder hover:border-input-border-hover focus:border-input-border-focus focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring disabled:bg-input-disabled-bg aria-invalid:border-2 aria-invalid:border-input-border-error";

export function Field({ label, name, error, hint, prefix, className, ...props }: FieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block type-label text-input-label">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        {prefix && (
          <span className="flex min-h-12 items-center rounded-md border border-input-border bg-surface-sunken px-3 font-mono text-base font-medium text-text-muted">
            {prefix}
          </span>
        )}
        <input id={name} name={name} aria-invalid={Boolean(error)} aria-describedby={errorId} className={inputClass} {...props} />
      </div>
      {hint && !error && <p className="mt-1.5 type-caption text-input-help">{hint}</p>}
      {error && (
        <p id={errorId} className="mt-1.5 type-caption-strong text-input-error">
          {error}
        </p>
      )}
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  error?: string;
} & Omit<ComponentProps<"select">, "name" | "children">;

export function SelectField({ label, name, options, placeholder, error, className, ...props }: SelectFieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block type-label text-input-label">
        {label}
      </label>
      <select id={name} name={name} aria-invalid={Boolean(error)} aria-describedby={errorId} className={inputClass} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 type-caption-strong text-input-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-fail-tint px-4 py-3 type-body-sm text-text">
      {message}
    </p>
  );
}

type TextAreaFieldProps = {
  label: string;
  name: string;
  error?: string;
} & Omit<ComponentProps<"textarea">, "name">;

export function TextAreaField({ label, name, error, className, ...props }: TextAreaFieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block type-label text-input-label">
        {label}
      </label>
      <textarea id={name} name={name} rows={2} aria-invalid={Boolean(error)} aria-describedby={errorId} className={`${inputClass} py-3`} {...props} />
      {error && (
        <p id={errorId} className="mt-1.5 type-caption-strong text-input-error">
          {error}
        </p>
      )}
    </div>
  );
}
