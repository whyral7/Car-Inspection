"use client";

import { createContext, useCallback, useContext } from "react";
import { DEFAULT_LOCALE, stringsFor, translateMessage, type Locale } from "@/lib/i18n";
import type { Strings } from "@/lib/strings";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Set once in the root layout from the reader's cookie. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** The reader's strings, for client components. Server code uses getT() from lib/i18n.server. */
export function useT(): Strings {
  return stringsFor(useLocale());
}

/** Translates a fixed English message (e.g. a zod error or a server action's error) into the reader's language. */
export function useTranslateMessage(): (message: string) => string {
  const locale = useLocale();
  return useCallback((message: string) => translateMessage(message, locale), [locale]);
}
