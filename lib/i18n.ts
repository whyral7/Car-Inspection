import { en, type Strings } from "@/lib/strings";
import { hi } from "@/lib/strings.hi";

export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
/** Cookie that remembers the reader's language for a year. */
export const LOCALE_COOKIE = "tm_lang";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function stringsFor(locale: Locale): Strings {
  return locale === "hi" ? hi : en;
}

/** Open Graph locale for each language. */
export const OG_LOCALE: Record<Locale, string> = { en: "en_IN", hi: "hi_IN" };

const lookups = new Map<Locale, Map<string, string>>();

/** English text -> the same entry in `locale`, for every fixed (non-function) string. */
function lookupFor(locale: Locale): Map<string, string> {
  let map = lookups.get(locale);
  if (map) return map;
  map = new Map();
  const walk = (a: unknown, b: unknown) => {
    if (typeof a === "string" && typeof b === "string") {
      if (!map!.has(a)) map!.set(a, b);
    } else if (a && b && typeof a === "object" && typeof b === "object") {
      for (const key of Object.keys(a)) walk((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]);
    }
  };
  walk(en, stringsFor(locale));
  lookups.set(locale, map);
  return map;
}

/**
 * Translates a fixed English message (such as a zod error built from `t`) into `locale`.
 * Messages that aren't in the strings file come back unchanged.
 */
export function translateMessage(message: string, locale: Locale): string {
  if (locale === "en") return message;
  return lookupFor(locale).get(message) ?? message;
}
