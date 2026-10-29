"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, dictionary, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Makes the request's language available to client components (strings can't be passed as props: they hold functions). */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  return dictionary(useLocale());
}
