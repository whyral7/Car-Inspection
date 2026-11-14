import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Spinner } from "@/components/icons";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700";

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 text-small",
  md: "min-h-12 px-5 text-body",
  lg: "min-h-14 px-6 text-body",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-700 text-white shadow-card hover:bg-brand-800 active:bg-brand-900",
  secondary: "bg-surface text-ink shadow-card ring-1 ring-line ring-inset hover:bg-canvas active:bg-sunken",
  ghost: "text-brand-700 hover:bg-brand-50 active:bg-brand-100",
  danger: "bg-danger-700 text-white shadow-card hover:bg-danger-800 active:bg-danger-800",
  "danger-ghost": "text-danger-700 hover:bg-danger-50 active:bg-danger-50",
};

// Disabled looks grey rather than faded, so it reads as "not yet" in bright sunlight.
// Text-only variants just go grey.
const disabledLook = "cursor-not-allowed !bg-sunken !text-ink-subtle !shadow-none !ring-0 active:!scale-100";
const disabledText = "cursor-not-allowed !bg-transparent !text-ink-subtle active:!scale-100";

export function buttonClass(variant: ButtonVariant = "primary", className = "", disabled = false, size: ButtonSize = "md") {
  const off = variant === "ghost" || variant === "danger-ghost" ? disabledText : disabledLook;
  return `${base} ${sizes[size]} ${variants[variant]} ${disabled ? off : ""} ${className}`;
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; icon?: ReactNode };

/** While `loading` the button keeps its colour and shows a spinner in place of its icon; `disabled` turns it grey. */
export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, className, Boolean(disabled) && !loading, size)}
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
  const color = { brand: "text-brand-700", muted: "text-ink-muted", danger: "text-danger-700" }[tone];
  return (
    <button
      type="button"
      className={`-mx-2 inline-flex min-h-11 items-center gap-2 rounded-chip px-2 text-small font-semibold transition-colors hover:bg-sunken disabled:text-ink-subtle ${color} ${className}`}
      {...props}
    />
  );
}
