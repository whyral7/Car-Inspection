"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

// Brand rating control (brand/reference/components/ChecklistItem.md): joined segments, 44px tall, a
// border-control edge with hairline dividers. A chosen rating takes its rating tint; any other choice
// takes the accent tint. Behaves like a radio group (arrow keys move the selection).

export type SegmentOption<V extends string> = {
  value: V;
  label: string;
  icon?: ReactNode;
  /** A rating option: the selected state uses that rating's tint and colour. */
  verdict?: "pass" | "attention" | "fail" | "na";
};

const selectedLook = {
  pass: "bg-verdict-pass-bg text-verdict-pass-fg",
  attention: "bg-verdict-attention-bg text-verdict-attention-fg",
  fail: "bg-verdict-fail-bg text-verdict-fail-fg",
  na: "bg-seg-na-bg-on text-seg-na-fg-on",
  choice: "bg-accent-tint text-text",
} as const;

export function Segmented<V extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  className = "",
  columns,
  invalid,
  describedBy,
}: {
  label: string;
  options: readonly SegmentOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  disabled?: boolean;
  className?: string;
  /** Grid column classes for options that can't share one row, e.g. "grid-cols-1 min-[380px]:grid-cols-3". Default: one joined row. */
  columns?: string;
  /** Marks the group as unanswered after a submit; focusFirstError() lands on its first option. */
  invalid?: boolean;
  /** Id of the error message, read out with the group. */
  describedBy?: string;
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
  const edge = invalid ? "border-2 border-input-border-error" : "border border-seg-border";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      // Joined: one outline around the row. In columns: each option keeps its own outline, with gaps.
      className={`grid ${columns ? `gap-2 ${columns}` : `overflow-hidden rounded-md bg-seg-divider gap-px ${edge}`} ${className}`}
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
            // The focusable option carries the error so focusFirstError() can reach the group.
            aria-invalid={invalid && i === focusIndex ? true : undefined}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-[var(--seg-height)] px-1 transition-[background-color,color] [font:var(--seg-font)] focus-visible:relative focus-visible:z-10 disabled:opacity-[var(--button-disabled-opacity)] ${columns ? `rounded-md ${edge}` : ""} ${
              selected ? selectedLook[o.verdict ?? "choice"] : "bg-seg-bg text-seg-fg hover:bg-surface-sunken"
            } ${selected && columns && !o.verdict ? "border-accent" : ""}`}
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
