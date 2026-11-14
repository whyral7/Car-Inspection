import { describe, expect, it } from "vitest";
import { errorText, pickLocale } from "@/lib/i18n";
import { en } from "@/lib/strings";

describe("pickLocale", () => {
  it("uses a saved choice", () => {
    expect(pickLocale("hi", "en-IN,en;q=0.9")).toBe("hi");
    expect(pickLocale("en", "hi-IN,hi;q=0.9")).toBe("en");
  });

  it("falls back to the browser's first known language", () => {
    expect(pickLocale(undefined, "hi-IN,hi;q=0.9,en;q=0.8")).toBe("hi");
    expect(pickLocale(undefined, "en-IN,hi;q=0.9")).toBe("en");
    expect(pickLocale(undefined, "mr-IN,hi;q=0.8")).toBe("hi");
  });

  it("defaults to English", () => {
    expect(pickLocale("fr", null)).toBe("en");
    expect(pickLocale(undefined, "")).toBe("en");
  });
});

describe("errorText", () => {
  it("resolves a key", () => {
    expect(errorText(en, "cars.errors.make")).toBe(en.cars.errors.make);
  });

  it("returns unknown keys and plain text unchanged", () => {
    expect(errorText(en, "cars.errors.nope")).toBe("cars.errors.nope");
    expect(errorText(en, "Something else")).toBe("Something else");
    expect(errorText(en, "cars.errors")).toBe("cars.errors");
    expect(errorText(en, undefined)).toBe("");
  });
});
