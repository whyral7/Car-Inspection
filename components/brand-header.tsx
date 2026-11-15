import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";

/**
 * The top of every screen (brand book, "App and PWA"): the small lockup with the हिंदी toggle beside
 * it, on a white bar. `children` sit to the right of the toggle (an account button, "Log in").
 * `plain` drops the bar for screens that are a single centred column (login, onboarding).
 */
export function BrandHeader({
  href = "/",
  homeLabel,
  children,
  plain = false,
  width = "max-w-2xl",
}: {
  href?: string;
  /** Spoken name of the logo link, e.g. "Treadmark: My cars". */
  homeLabel: string;
  children?: ReactNode;
  plain?: boolean;
  width?: string;
}) {
  return (
    <header className={plain ? "pt-[env(safe-area-inset-top)]" : "sticky top-0 z-20 border-b border-border bg-surface pt-[env(safe-area-inset-top)]"}>
      <div className={`mx-auto flex min-h-14 w-full items-center gap-2 ${plain ? "" : `px-4 ${width}`}`}>
        {/* The lockup keeps its clear space: nothing sits closer than the gap, and it never shrinks. */}
        <Link href={href} aria-label={homeLabel} className="mr-auto flex min-h-11 shrink-0 items-center rounded-sm">
          <Logo className="h-[22px] w-auto min-[360px]:h-[26px]" />
        </Link>
        <LanguageToggle />
        {children}
      </div>
    </header>
  );
}
