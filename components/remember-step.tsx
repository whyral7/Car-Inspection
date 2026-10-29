"use client";

import { useEffect } from "react";
import type { InspectionStep } from "@/lib/inspection";
import { rememberStep } from "@/lib/resume";

/** Drop into an inspection screen so the home screen can offer to resume it. Renders nothing. */
export function RememberStep({ carId, step }: { carId: string; step: InspectionStep }) {
  useEffect(() => rememberStep(carId, step), [carId, step]);
  return null;
}
