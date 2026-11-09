import Link from "next/link";
import type { ComponentProps } from "react";

// Brand Button spec (brand/reference/components/Button.md): component tokens only.
type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 type-title-sm tracking-[0.005em] transition-[background-color,transform] duration-120 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary: "bg-button-primary-bg text-button-primary-fg hover:bg-button-primary-bg-hover active:bg-button-primary-bg-hover",
  secondary:
    "border border-button-secondary-border bg-button-secondary-bg text-button-secondary-fg hover:bg-button-secondary-bg-hover active:bg-button-secondary-bg-hover",
  ghost: "text-button-ghost-fg hover:bg-button-ghost-bg-hover active:bg-button-ghost-bg-hover",
  danger:
    "border border-button-danger-border bg-button-danger-bg text-button-danger-fg hover:bg-button-danger-bg-hover active:bg-button-danger-bg-hover",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`;
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; loading?: boolean };

export function Button({ variant = "primary", loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={buttonClass(variant, className)} disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant };

export function LinkButton({ variant = "primary", className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
