"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { STORAGE_BUCKETS } from "@/lib/config";
import { errorText } from "@/lib/i18n";
import { getT } from "@/lib/i18n.server";
import { getCurrentProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { carDetailsSchema, type CarDetailsField } from "@/lib/validation/car";
import type { CarFormValues } from "../new/actions";

export type UpdateCarState = {
  fieldErrors?: Partial<Record<CarDetailsField, string>>;
  formError?: string;
};

/** Saves edited car details (the number plate and RC data stay as they are). */
export async function updateCar(carId: string, input: CarFormValues): Promise<UpdateCarState> {
  const t = await getT();
  if (!z.uuid().safeParse(carId).success) return { formError: t.common.somethingWrong };
  const { supabase } = await getCurrentProfile();

  const parsed = carDetailsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: UpdateCarState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as CarDetailsField] ??= errorText(t, issue.message);
    return { fieldErrors };
  }

  // RLS limits the update to the user's own car; no row back means it isn't theirs.
  const { data, error } = await supabase.from("cars").update(parsed.data).eq("id", carId).select("id");
  if (error || !data?.length) return { formError: t.common.somethingWrong };

  redirect(`/app/cars/${carId}`);
}

/**
 * Deletes a car with everything attached: photos, notes, checklist, price estimate and report (the
 * public link stops working). Rows go by cascade; stored files are removed with the service role
 * after checking the car belongs to the user.
 */
export async function deleteCar(carId: string): Promise<{ ok: false; error: string }> {
  const t = await getT();
  if (!z.uuid().safeParse(carId).success) return { ok: false, error: t.common.somethingWrong };
  const { supabase } = await getCurrentProfile();

  const { data: car, error } = await supabase.from("cars").select("id").eq("id", carId).maybeSingle();
  if (error || !car) return { ok: false, error: t.car.deleteFailed };

  const admin = createAdminClient();
  const photos = admin.storage.from(STORAGE_BUCKETS.inspectionPhotos);
  const reports = admin.storage.from(STORAGE_BUCKETS.reports);
  const [full, small, pdfs] = await Promise.all([photos.list(`cars/${carId}`, { limit: 100 }), photos.list(`cars/${carId}/small`, { limit: 100 }), reports.list(carId, { limit: 100 })]);
  // Folders show up in listings with a null id; only files are removed.
  const files = (list: typeof full, prefix: string) => (list.data ?? []).filter((f) => f.id).map((f) => `${prefix}/${f.name}`);
  const photoFiles = [...files(full, `cars/${carId}`), ...files(small, `cars/${carId}/small`)];
  const pdfFiles = files(pdfs, carId);

  const { error: deleteError } = await supabase.from("cars").delete().eq("id", carId);
  if (deleteError) return { ok: false, error: t.car.deleteFailed };

  // Best effort: the rows are gone, so leftover files are unreachable either way.
  await Promise.all([photoFiles.length ? photos.remove(photoFiles) : null, pdfFiles.length ? reports.remove(pdfFiles) : null]);

  redirect("/app?deleted=1");
}
