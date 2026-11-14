// Remembers the last inspection screen opened on this phone, so "Continue" on the home screen goes
// straight back to it. Browser-only and best effort: private mode or cleared storage just falls back
// to the car's next unfinished step.
import { useMemo, useSyncExternalStore } from "react";
import type { InspectionStep } from "@/lib/inspection";

const KEY = "treadmark:last-step";

export type LastStep = { carId: string; step: InspectionStep; at: number };

export function rememberStep(carId: string, step: InspectionStep) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ carId, step, at: Date.now() } satisfies LastStep));
  } catch {
    // Storage blocked: nothing to remember.
  }
}

function readRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): LastStep | null {
  try {
    const value = JSON.parse(raw ?? "null") as Partial<LastStep> | null;
    return value && typeof value.carId === "string" && typeof value.step === "string" && typeof value.at === "number" ? (value as LastStep) : null;
  } catch {
    return null;
  }
}

export function readLastStep(): LastStep | null {
  return parse(readRaw());
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** The last step, read after hydration (null on the server and in the first render). */
export function useLastStep() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parse(raw), [raw]);
}

export function forgetCar(carId: string) {
  if (readLastStep()?.carId === carId) {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}
