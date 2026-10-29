import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowLeftIcon, Spinner } from "@/components/icons";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700";

const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-white active:bg-brand-800",
  secondary: "border border-slate-300 bg-white text-ink active:bg-slate-100",
  ghost: "text-brand-700 active:bg-brand-50",
  danger: "bg-red-700 text-white active:bg-red-800",
  whatsapp: "bg-whatsapp text-white active:bg-whatsapp-pressed",
};

// Disabled looks grey rather than faded, so it reads as "not yet" in bright sunlight.
const disabledLook: Record<Variant, string> = {
  primary: "!bg-slate-200 !text-slate-600",
  secondary: "!bg-slate-50 !text-slate-500",
  ghost: "!text-slate-500",
  danger: "!bg-slate-200 !text-slate-600",
  whatsapp: "!bg-slate-200 !text-slate-600",
};

export function buttonClass(variant: Variant = "primary", className = "", disabled = false) {
  return `${base} ${variants[variant]} ${disabled ? `cursor-not-allowed ${disabledLook[variant]}` : ""} ${className}`;
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; loading?: boolean };

/** While `loading` the button keeps its colour and shows a spinner; `disabled` turns it grey. */
export function Button({ variant = "primary", loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={buttonClass(variant, className, Boolean(disabled) && !loading)} disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant };

export function LinkButton({ variant = "primary", className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

/** The "← Back to …" link at the top of a screen. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="-ml-1 inline-flex min-h-11 items-center gap-1.5 self-start px-1 text-sm font-semibold text-brand-700">
      <ArrowLeftIcon size={18} />
      {children}
    </Link>
  );
}

/**
 * Bottom action bar on task screens: the main action stays in thumb reach while the page scrolls.
 * Solid background (no blur, which is slow on low-end phones).
 */
export function StickyActions({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col gap-2 border-t border-line bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgb(15_23_42/0.06)] ${className}`}
    >
      {children}
    </div>
  );
}
