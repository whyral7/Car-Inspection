"use client";

import { useRef, type KeyboardEvent } from "react";

export type SegmentOption<V extends string> = {
  value: V;
  label: string;
  /** Classes for the selected state, e.g. "bg-red-600 text-white border-red-600". */
  selectedClass?: string;
};

const defaultSelected = "border-brand-700 bg-brand-700 text-white";

/** A row of big tap targets that behaves like a radio group (arrow keys move the selection). */
export function Segmented<V extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  className = "",
}: {
  label: string;
  options: readonly SegmentOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  disabled?: boolean;
  className?: string;
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
    <div role="radiogroup" aria-label={label} className={`grid gap-1.5 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
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
            className={`min-h-11 rounded-xl border px-1 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 ${
              selected ? (o.selectedClass ?? defaultSelected) : "border-slate-300 bg-white text-ink active:bg-slate-100"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
