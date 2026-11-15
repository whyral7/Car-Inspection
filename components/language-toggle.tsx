"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import { setLocale } from "@/lib/i18n.actions";
import type { Locale } from "@/lib/i18n";

/**
 * हिंदी / English switch, on every screen beside the logo (brand book: bilingual by default).
 * It names the language you switch TO, in that language. Saves the choice and re-renders the page.
 */
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
      aria-label={t.common.switchToLabel}
      aria-busy={pending || undefined}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setLocale(next);
          router.refresh();
        })
      }
      className={`inline-flex min-h-11 shrink-0 items-center rounded-md border border-button-secondary-border bg-button-secondary-bg px-3 type-label text-button-ghost-fg transition-colors hover:bg-button-secondary-bg-hover disabled:opacity-[var(--button-disabled-opacity)] ${className}`}
    >
      {t.common.switchTo}
    </button>
  );
}
