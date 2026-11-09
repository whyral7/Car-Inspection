import { describe, expect, it } from "vitest";
import { isLocale, stringsFor, translateMessage } from "@/lib/i18n";
import { en } from "@/lib/strings";
import { hi } from "@/lib/strings.hi";

/** Every fixed string, with its path, e.g. ["cars.errors.make", "Enter the make, like Maruti Suzuki."]. */
function leaves(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
}

// Same in both languages on purpose: brand names, codes, units, numbers and examples.
const SAME_IN_HINDI = /^(appName|home\.preview\.(dealer|reg|car|score|outOf)|home\.free\.price|legal\..*|.*Placeholder|cars\.regPlaceholder|cars\.fuels\.(cng|lpg)|car\.scoreOutOf|publicReport\.outOf|checklist\.results\.na|findings\.fromAi|findings\.odometer\.placeholder|login\.phonePlaceholder|legal\.contact\.whatsapp)$/;

describe("Hindi strings", () => {
  it("translate every English string that isn't a name, code or example", () => {
    const hiLeaves = new Map(leaves(hi));
    const untranslated = leaves(en).filter(([path, value]) => !SAME_IN_HINDI.test(path) && hiLeaves.get(path) === value);
    expect(untranslated).toEqual([]);
  });

  it("have no empty strings", () => {
    expect(leaves(hi).filter(([, v]) => v.trim() === "" && v !== "")).toEqual([]);
  });

  it("keep the required English disclaimer on reports", () => {
    expect(hi.disclaimer).toContain(en.disclaimer);
  });

  it("build sentences from numbers", () => {
    expect(hi.credits.balance(1)).toBe("आपके पास 1 क्रेडिट है।");
    expect(hi.credits.balance(5)).toBe("आपके पास 5 क्रेडिट हैं।");
    expect(hi.cars.ownerOrdinal(2)).toBe("दूसरा मालिक");
    expect(hi.cars.ownerOrdinal(7)).toBe("7वाँ मालिक");
    expect(hi.report.shareMessage("2019 Maruti Suzuki Swift", "MH12AB1234", "8.4", "https://x.test/r/a")).toContain("8.4/10");
  });

  it("follow the voice rules: no exclamation marks or banned claims", () => {
    for (const [path, value] of leaves(hi)) {
      expect(value, path).not.toMatch(/!/);
      expect(value, path).not.toMatch(/guaranteed|accident-free|गारंटी/i);
    }
  });
});

describe("locale helpers", () => {
  it("recognise only supported languages", () => {
    expect(isLocale("hi")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("pick the strings for a language", () => {
    expect(stringsFor("hi").dashboard.myCars).toBe("मेरी गाड़ियाँ");
    expect(stringsFor("en").dashboard.myCars).toBe("My cars");
  });

  it("translate fixed English messages, such as zod errors", () => {
    expect(translateMessage(en.cars.errors.make, "hi")).toBe(hi.cars.errors.make);
    expect(translateMessage(en.login.errors.invalidPhone, "hi")).toBe(hi.login.errors.invalidPhone);
    expect(translateMessage(en.cars.errors.make, "en")).toBe(en.cars.errors.make);
    expect(translateMessage("Something not in the strings file", "hi")).toBe("Something not in the strings file");
  });
});
