"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "@/lib/i18n";

/** हिंदी / English switch. Saves the choice in a cookie and re-renders the page in that language. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next: Locale = locale === "hi" ? "en" : "hi";

  return (
    <button
      type="button"
      lang={next}
      aria-label={t.language.switchToLabel}
      disabled={pending}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
        startTransition(() => router.refresh());
      }}
      className={`inline-flex min-h-11 items-center rounded-md border border-border-control bg-surface px-3 type-label text-accent disabled:opacity-60 ${className}`}
    >
      {t.language.switchTo}
    </button>
  );
}
