import Link from "next/link";
import { buttonClass } from "@/components/button";
import { t } from "@/lib/strings";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2">
        <Link href="/" className="mr-auto flex min-h-11 items-center" aria-label={t.appName}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG; the small lockup suits a header */}
          <img src="/brand/treadmark-lockup-small-color.svg" alt={t.appName} width={136} height={28} className="h-7 w-auto" />
        </Link>
        <Link href="/#pricing" className="hidden min-h-11 items-center px-3 text-sm font-medium text-text-muted sm:flex">
          {t.home.nav.pricing}
        </Link>
        <Link href="/login" className={buttonClass("secondary", "min-h-11 px-4 text-sm")}>
          {t.home.nav.login}
        </Link>
      </nav>
    </header>
  );
}
