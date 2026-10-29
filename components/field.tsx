import type { ComponentProps, ReactNode } from "react";
import { AlertIcon } from "@/components/icons";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  prefix?: string;
} & Omit<ComponentProps<"input">, "name" | "prefix">;

export const inputClass =
  "block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-ink placeholder:text-slate-500 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100 aria-invalid:border-red-600";

export function Field({ label, name, error, hint, prefix, className, ...props }: FieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        {prefix && (
          <span className="flex min-h-12 items-center rounded-xl border border-slate-300 bg-slate-100 px-3 text-base font-medium text-slate-700">
            {prefix}
          </span>
        )}
        <input id={name} name={name} aria-invalid={Boolean(error)} aria-describedby={errorId} className={inputClass} {...props} />
      </div>
      {hint && !error && <p className="mt-1.5 text-sm text-slate-600">{hint}</p>}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-red-700">
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
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
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
        <p id={errorId} className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
      <AlertIcon size={18} className="mt-px" />
      <span>{message}</span>
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
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea id={name} name={name} rows={2} aria-invalid={Boolean(error)} aria-describedby={errorId} className={`${inputClass} py-3`} {...props} />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** After a failed submit, move focus (and the screen) to the first field with an error. */
export function focusFirstError(form: HTMLElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
}
