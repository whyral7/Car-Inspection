import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDraft, readDraft, saveDraft } from "@/lib/draft";
import { memoryStorage } from "@/lib/storage-test-helpers";

describe("form drafts", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("saves, reads back and clears", () => {
    saveDraft("finding:new", { location: "Front bumper", note: "" });
    expect(readDraft("finding:new")).toEqual({ location: "Front bumper", note: "" });
    clearDraft("finding:new");
    expect(readDraft("finding:new")).toBeNull();
  });

  it("drops drafts older than a week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T10:00:00Z"));
    saveDraft("car-new:MH12AB1234", { make: "Honda" });
    vi.setSystemTime(new Date("2026-10-09T10:00:00Z"));
    expect(readDraft("car-new:MH12AB1234")).toBeNull();
  });

  it("works without storage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => saveDraft("x", { a: "b" })).not.toThrow();
    expect(readDraft("x")).toBeNull();
  });
});
