"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import { GlobeIcon } from "@/components/icons";
import { setLocale } from "@/lib/i18n.actions";
import { LOCALES, type Locale } from "@/lib/i18n";

/** English / हिन्दी switch. Saves a cookie and re-renders the page in the new language. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const t = useT();
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === current) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <div role="radiogroup" aria-label={t.common.language} aria-busy={pending} className={`inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white p-1 ${className}`}>
      <GlobeIcon size={16} className="mx-1.5 text-slate-600" />
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          role="radio"
          aria-checked={locale === current}
          lang={locale}
          onClick={() => choose(locale)}
          className={`min-h-10 rounded-full px-3 text-sm font-semibold ${locale === current ? "bg-brand-700 text-white" : "text-ink active:bg-slate-100"}`}
        >
          {t.common.languageNames[locale]}
        </button>
      ))}
    </div>
  );
}
