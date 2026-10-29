import Link from "next/link";
import { buttonClass } from "@/components/button";
import { en as t } from "@/lib/strings";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white pt-[env(safe-area-inset-top)]">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2">
        <Link href="/" className="mr-auto flex min-h-11 items-center gap-2 text-lg font-bold text-brand-700">
          <span aria-hidden className="flex size-8 items-center justify-center rounded-lg bg-brand-700 text-sm text-white">
            T
          </span>
          {t.appName}
        </Link>
        <Link href="/#pricing" className="hidden min-h-11 items-center px-3 text-sm font-medium text-slate-700 sm:flex">
          {t.home.nav.pricing}
        </Link>
        <Link href="/login" className={buttonClass("secondary", "min-h-11 px-4 text-sm")}>
          {t.home.nav.login}
        </Link>
      </nav>
    </header>
  );
}
