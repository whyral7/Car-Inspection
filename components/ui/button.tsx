import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Spinner } from "@/components/icons";

// Brand Button (brand/reference/components/Button.md). One primary per screen, for the step the screen
// exists for; everything else is secondary or ghost. Reads only the button-* tokens.

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
/** `sm` and `md` are the 44px default (sm has tighter side padding); `lg` is 52px, for the bottom bar. */
export type ButtonSize = "sm" | "md" | "lg";

// `tm-btn` lets the bottom bar size its buttons up without every screen passing size="lg".
const base =
  "tm-btn inline-flex select-none items-center justify-center gap-2 rounded-md tracking-[var(--tracking-button)] transition-[background-color,border-color,color,scale] active:scale-[var(--button-press-scale)]";

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-[var(--button-height)] px-4 [font:var(--button-font)]",
  md: "min-h-[var(--button-height)] px-[var(--button-padding-x)] [font:var(--button-font)]",
  lg: "min-h-[var(--button-height-lg)] px-[var(--button-padding-x-lg)] [font:var(--button-font-lg)]",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-button-primary-bg text-button-primary-fg hover:bg-button-primary-bg-hover active:bg-button-primary-bg-hover",
  secondary:
    "border border-button-secondary-border bg-button-secondary-bg text-button-secondary-fg hover:bg-button-secondary-bg-hover active:bg-button-secondary-bg-hover",
  ghost: "text-button-ghost-fg hover:bg-button-ghost-bg-hover active:bg-button-ghost-bg-hover",
  // Outlined, never a red fill; the screen confirms or offers undo.
  danger: "border border-button-danger-border bg-button-danger-bg text-button-danger-fg hover:bg-button-danger-bg-hover active:bg-button-danger-bg-hover",
  "danger-ghost": "text-button-danger-fg hover:bg-button-danger-bg-hover active:bg-button-danger-bg-hover",
};

const disabledLook = "pointer-events-none opacity-[var(--button-disabled-opacity)]";

export function buttonClass(variant: ButtonVariant = "primary", className = "", disabled = false, size: ButtonSize = "md") {
  return `${base} ${sizes[size]} ${variants[variant]} ${disabled ? disabledLook : ""} ${className}`;
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; icon?: ReactNode };

/**
 * While `loading` the button keeps its width and colour, shows a spinner in place of its icon and can't
 * be pressed; give it a label that says what is happening ("Publishing…"). `disabled` fades it.
 */
export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, `${loading ? "pointer-events-none" : ""} ${className ?? ""}`, Boolean(disabled) && !loading, size)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode };

export function LinkButton({ variant = "primary", size = "md", icon, className, children, ...props }: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, className, false, size)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

/** Plain-text action ("Edit", "Retake") that still has a 44px tap target. */
export function TextButton({ tone = "brand", className = "", ...props }: ComponentProps<"button"> & { tone?: "brand" | "muted" | "danger" }) {
  const color = { brand: "text-button-ghost-fg", muted: "text-text-muted", danger: "text-button-danger-fg" }[tone];
  return (
    <button
      type="button"
      className={`-mx-2 inline-flex min-h-11 items-center gap-2 rounded-sm px-2 type-label transition-colors hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-[var(--button-disabled-opacity)] ${color} ${className}`}
      {...props}
    />
  );
}
