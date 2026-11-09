"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Segmented, type SegmentOption } from "@/components/segmented";
import type { ChecklistResult } from "@/lib/supabase/database.types";

/** The checklist rating control, live, so its selected states can be tried on the brand page. */
export function RatingDemo({ initial }: { initial: ChecklistResult | null }) {
  const t = useT();
  const [value, setValue] = useState<ChecklistResult | null>(initial);
  const options: readonly SegmentOption<ChecklistResult>[] = [
    { value: "ok", label: t.checklist.results.ok, selectedClass: "border-verdict-pass-fg bg-verdict-pass-bg text-verdict-pass-fg" },
    { value: "attention", label: t.checklist.results.attention, selectedClass: "border-verdict-attention-fg bg-verdict-attention-bg text-verdict-attention-fg" },
    { value: "fail", label: t.checklist.results.fail, selectedClass: "border-verdict-fail-fg bg-verdict-fail-bg text-verdict-fail-fg" },
    { value: "na", label: t.checklist.results.na, selectedClass: "border-text bg-seg-na-bg-on text-seg-na-fg-on" },
  ];
  return <Segmented label={t.checklist.items.brakes.label} options={options} value={value} onChange={setValue} />;
}
