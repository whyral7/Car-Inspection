import type { ComponentProps, ReactNode } from "react";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  prefix?: string;
} & Omit<ComponentProps<"input">, "name" | "prefix">;

export const inputClass =
  "block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100 aria-invalid:border-red-500";

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
      {hint && !error && <p className="mt-1.5 text-sm text-slate-500">{hint}</p>}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </p>
  );
}
