"use server";

import { z } from "zod";
import { getCurrentDealer } from "@/lib/dealer";
import { t } from "@/lib/strings";
import type { FindingRow } from "@/lib/supabase/database.types";
import { findingInputSchema, odometerSchema, type FindingField } from "@/lib/validation/finding";

// Every query runs as the dealer, so RLS limits it to their own cars.

const id = z.uuid();

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setFindingsAccepted(findingIds: string[], accepted: boolean): Promise<ActionResult> {
  const ids = z.array(id).min(1).max(500).safeParse(findingIds);
  if (!ids.success) return { ok: false, error: t.common.somethingWrong };
  const { supabase } = await getCurrentDealer();
  const { error } = await supabase.from("findings").update({ accepted }).in("id", ids.data);
  return error ? { ok: false, error: t.findings.errors.save } : { ok: true };
}

export async function deleteFinding(findingId: string): Promise<ActionResult> {
  if (!id.safeParse(findingId).success) return { ok: false, error: t.common.somethingWrong };
  const { supabase } = await getCurrentDealer();
  const { error } = await supabase.from("findings").delete().eq("id", findingId);
  return error ? { ok: false, error: t.findings.errors.save } : { ok: true };
}

/** Form values as the client holds them: plain strings, validated here. */
export type FindingFormInput = { type: string; severity: string; location: string; note: string };

export type SaveFindingResult =
  | { ok: true; finding: FindingRow }
  | { ok: false; fieldErrors?: Partial<Record<FindingField, string>>; error?: string };

/**
 * Adds a dealer finding (no findingId) or edits an existing one. Either way the dealer has looked
 * at it, so it is saved as accepted. An edited AI finding keeps source = 'ai'.
 */
export async function saveFinding(input: FindingFormInput & { carId: string; photoId: string | null; findingId?: string }): Promise<SaveFindingResult> {
  const ids = z.object({ carId: id, photoId: id.nullable(), findingId: id.optional() }).safeParse(input);
  if (!ids.success) return { ok: false, error: t.common.somethingWrong };

  const parsed = findingInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<FindingField, string>> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as FindingField] ??= issue.message;
    return { ok: false, fieldErrors };
  }

  const { supabase } = await getCurrentDealer();
  const { carId, photoId, findingId } = ids.data;

  if (findingId) {
    const { data, error } = await supabase.from("findings").update({ ...parsed.data, accepted: true }).eq("id", findingId).eq("car_id", carId).select("*").single();
    return error ? { ok: false, error: t.findings.errors.save } : { ok: true, finding: data };
  }

  if (photoId) {
    // The photo must belong to this car, not just to the dealer.
    const { data: photo } = await supabase.from("inspection_photos").select("id").eq("id", photoId).eq("car_id", carId).maybeSingle();
    if (!photo) return { ok: false, error: t.common.somethingWrong };
  }
  const { data, error } = await supabase
    .from("findings")
    .insert({ ...parsed.data, car_id: carId, photo_id: photoId, source: "dealer", accepted: true })
    .select("*")
    .single();
  return error ? { ok: false, error: t.findings.errors.save } : { ok: true, finding: data };
}

export async function confirmOdometer(carId: string, km: string | number): Promise<{ ok: true; km: number } | { ok: false; error: string }> {
  if (!id.safeParse(carId).success) return { ok: false, error: t.common.somethingWrong };
  const parsed = odometerSchema.safeParse(km);
  if (!parsed.success) return { ok: false, error: t.findings.errors.odometer };
  const { supabase } = await getCurrentDealer();
  const { data, error } = await supabase.from("cars").update({ odometer_km: parsed.data }).eq("id", carId).select("id");
  if (error || data.length === 0) return { ok: false, error: t.findings.errors.save };
  return { ok: true, km: parsed.data };
}
