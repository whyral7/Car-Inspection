import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { getT } from "@/lib/i18n.server";

export async function SiteHeader() {
  const t = await getT();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2">
        <Link href="/" className="mr-auto flex min-h-11 items-center gap-2 type-heading-2 text-accent">
          <span aria-hidden className="flex size-8 items-center justify-center rounded-sm bg-accent type-body-sm text-white">
            T
          </span>
          {t.appName}
        </Link>
        <Link href="/#pricing" className="hidden min-h-11 items-center rounded-sm px-4 type-label text-text-muted transition-colors hover:text-text sm:flex">
          {t.home.nav.pricing}
        </Link>
        <Link href="/login" className={buttonClass("secondary", "", false, "sm")}>
          {t.home.nav.login}
        </Link>
      </nav>
    </header>
  );
}
