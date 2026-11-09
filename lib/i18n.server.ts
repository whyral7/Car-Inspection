import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, stringsFor, translateMessage, type Locale } from "@/lib/i18n";
import type { Strings } from "@/lib/strings";

/** The reader's language for this request: their cookie, else English. */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** The reader's strings for this request. Server components, route handlers and server actions. */
export async function getT(): Promise<Strings> {
  return stringsFor(await getLocale());
}

/** Translates a fixed English message (e.g. a zod error) into the reader's language. */
export async function getTranslateMessage(): Promise<(message: string) => string> {
  const locale = await getLocale();
  return (message) => translateMessage(message, locale);
}
