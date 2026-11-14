import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { LOCALE_COOKIE, dictionary, pickLocale } from "@/lib/i18n";

/** The visitor's language for this request: the saved cookie, else the browser's preference. */
export const getLocale = cache(async () => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerList.get("accept-language"));
});

/** UI strings for this request's language. */
export const getT = cache(async () => dictionary(await getLocale()));
