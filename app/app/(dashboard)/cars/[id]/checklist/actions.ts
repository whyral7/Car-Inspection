"use server";

import { z } from "zod";
import { CHECKLIST_KEYS, checklistProgress } from "@/lib/checklist";
import { getCurrentProfile } from "@/lib/profile";
import { errorText } from "@/lib/i18n";
import { getT } from "@/lib/i18n.server";
import { checklistItemSchema } from "@/lib/validation/finding";

// Every query runs as the dealer, so RLS limits it to their own cars.

export type ChecklistActionResult = { ok: true } | { ok: false; error: string };

/** Saves one item's result and note. Called on every tap, so it upserts. */
export async function saveChecklistItem(carId: string, input: { item_key: string; result: string; note: string | null }): Promise<ChecklistActionResult> {
  const t = await getT();
  if (!z.uuid().safeParse(carId).success) return { ok: false, error: t.common.somethingWrong };
  const parsed = checklistItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: errorText(t, parsed.error.issues[0]?.message) || t.common.somethingWrong };

  const { supabase } = await getCurrentProfile();
  const { error } = await supabase.from("checklist_items").upsert({ car_id: carId, ...parsed.data }, { onConflict: "car_id,item_key" });
  return error ? { ok: false, error: t.checklist.saveFailed } : { ok: true };
}

/** Marks a draft car as inspected once every checklist item has an answer. */
export async function finishInspection(carId: string): Promise<ChecklistActionResult> {
  const t = await getT();
  if (!z.uuid().safeParse(carId).success) return { ok: false, error: t.common.somethingWrong };
  const { supabase } = await getCurrentProfile();

  const { data: items, error } = await supabase.from("checklist_items").select("item_key").eq("car_id", carId).in("item_key", [...CHECKLIST_KEYS]);
  if (error) return { ok: false, error: t.common.somethingWrong };
  if (!checklistProgress(items.map((i) => i.item_key)).complete) return { ok: false, error: t.checklist.errors.incomplete };

  // A published car stays published.
  const { error: updateError } = await supabase.from("cars").update({ status: "inspected" }).eq("id", carId).eq("status", "draft");
  return updateError ? { ok: false, error: t.common.somethingWrong } : { ok: true };
}
