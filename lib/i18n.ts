import { en, type Strings } from "@/lib/strings";
import { hi } from "@/lib/strings.hi";

export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that remembers the chosen language for a year. */
export const LOCALE_COOKIE = "lang";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const dictionaries: Record<Locale, Strings> = { en, hi };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function dictionary(locale: Locale): Strings {
  return dictionaries[locale];
}

/** The saved choice wins; otherwise Hindi when the browser lists Hindi before English. */
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  const tags = (acceptLanguage ?? "").split(",").map((part) => part.split(";")[0].trim().toLowerCase());
  const firstKnown = tags.find((tag) => tag.startsWith("hi") || tag.startsWith("en"));
  return firstKnown?.startsWith("hi") ? "hi" : DEFAULT_LOCALE;
}

/**
 * Validation schemas carry message keys like "cars.errors.make" so they can run on the server and in
 * the browser without knowing the language. This turns a key into text; anything else is returned as is.
 */
export function errorText(t: Strings, key: string | undefined): string {
  if (!key) return "";
  let node: unknown = t;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null || !(part in node)) return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : key;
}
