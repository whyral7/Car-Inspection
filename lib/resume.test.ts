import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stepHref } from "@/lib/inspection";
import { forgetCar, readLastStep, rememberStep } from "@/lib/resume";
import { memoryStorage } from "@/lib/storage-test-helpers";

describe("resume where you left off", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("remembers the last inspection screen", () => {
    rememberStep("car-1", "checklist");
    expect(readLastStep()).toMatchObject({ carId: "car-1", step: "checklist" });
  });

  it("forgets a deleted car but not another one", () => {
    rememberStep("car-1", "photos");
    forgetCar("car-2");
    expect(readLastStep()?.carId).toBe("car-1");
    forgetCar("car-1");
    expect(readLastStep()).toBeNull();
  });

  it("ignores junk in storage", () => {
    localStorage.setItem("treadmark:last-step", "{not json");
    expect(readLastStep()).toBeNull();
    localStorage.setItem("treadmark:last-step", JSON.stringify({ carId: 3 }));
    expect(readLastStep()).toBeNull();
  });

  it("links each step to its screen", () => {
    expect(stepHref("abc", "photos")).toBe("/app/cars/abc/inspect");
    expect(stepHref("abc", "findings")).toBe("/app/cars/abc/findings");
    expect(stepHref("abc", "checklist")).toBe("/app/cars/abc/checklist");
    expect(stepHref("abc", "report")).toBe("/app/cars/abc/report");
  });
});
