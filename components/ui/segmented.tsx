"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export type SegmentOption<V extends string> = {
  value: V;
  label: string;
  icon?: ReactNode;
  /** Classes for the selected state, e.g. "bg-danger-700 text-white ring-danger-700". */
  selectedClass?: string;
};

const defaultSelected = "bg-brand-700 text-white shadow-card ring-brand-700";

/** A row of big tap targets that behaves like a radio group (arrow keys move the selection). */
export function Segmented<V extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  className = "",
  columns,
}: {
  label: string;
  options: readonly SegmentOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  disabled?: boolean;
  className?: string;
  /** Grid column classes, e.g. "grid-cols-2 min-[400px]:grid-cols-4". Default: one row. */
  columns?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next].value);
  }

  const focusIndex = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid gap-2 ${columns ?? ""} ${className}`}
      style={columns ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === focusIndex ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-12 rounded-control px-1 text-small font-semibold ring-1 transition-[background-color,color,box-shadow] duration-150 ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:bg-sunken disabled:text-ink-subtle disabled:ring-line ${
              selected ? (o.selectedClass ?? defaultSelected) : "bg-surface text-ink ring-line-strong/60 hover:bg-canvas active:bg-sunken"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
