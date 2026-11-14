"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Segmented, type SegmentOption } from "@/components/ui";
import type { ChecklistResult } from "@/lib/supabase/database.types";

/** The checklist rating control, live, so its selected states can be tried on the brand page. */
export function RatingDemo({ initial }: { initial: ChecklistResult | null }) {
  const t = useT();
  const [value, setValue] = useState<ChecklistResult | null>(initial);
  const options: readonly SegmentOption<ChecklistResult>[] = [
    { value: "ok", label: t.checklist.results.ok, verdict: "pass" },
    { value: "attention", label: t.checklist.results.attention, verdict: "attention" },
    { value: "fail", label: t.checklist.results.fail, verdict: "fail" },
    { value: "na", label: t.checklist.results.na, verdict: "na" },
  ];
  return <Segmented label={t.checklist.items.brakes.label} options={options} value={value} onChange={setValue} />;
}
