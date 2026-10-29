import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { en as t } from "@/lib/strings";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2">
        <Link href="/" className="mr-auto flex min-h-11 items-center gap-2 text-heading font-bold text-brand-700">
          <span aria-hidden className="flex size-8 items-center justify-center rounded-chip bg-brand-700 text-small text-white">
            T
          </span>
          {t.appName}
        </Link>
        <Link href="/#pricing" className="hidden min-h-11 items-center px-3 text-small font-medium text-ink-muted sm:flex">
          {t.home.nav.pricing}
        </Link>
        <Link href="/login" className={buttonClass("secondary", "min-h-11 px-4 text-small")}>
          {t.home.nav.login}
        </Link>
      </nav>
    </header>
  );
}
