"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { lookupRc } from "@/lib/rc";
import { errorText } from "@/lib/i18n";
import { getT } from "@/lib/i18n.server";
import type { Json } from "@/lib/supabase/database.types";
import { newCarSchema, regNumberSchema, type NewCarField } from "@/lib/validation/car";

/** Form values as the client shows them: every field is a string. */
export type CarFormValues = {
  make: string;
  model: string;
  variant: string;
  fuel: string;
  transmission: string;
  year: string;
  owners: string;
  insurance_valid_upto: string;
};

export type LookupState =
  | { error: string }
  | {
      regNumber: string;
      status: "found" | "not_found" | "unavailable" | "manual";
      values: CarFormValues;
      rcRaw: Record<string, unknown> | null;
      existingCarId: string | null;
    };

const emptyValues: CarFormValues = {
  make: "",
  model: "",
  variant: "",
  fuel: "",
  transmission: "",
  year: "",
  owners: "",
  insurance_valid_upto: "",
};

/** Validates the number, checks for a duplicate and, unless `manual`, looks it up on the RC provider. */
export async function lookupRegNumber(input: string, manual = false): Promise<LookupState> {
  const t = await getT();
  const { supabase } = await getCurrentProfile();

  const parsed = regNumberSchema.safeParse(input);
  if (!parsed.success) return { error: t.cars.errors.regNumber };
  const regNumber = parsed.data;

  const [existing, rc] = await Promise.all([
    supabase.from("cars").select("id").eq("reg_number", regNumber).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    manual ? null : lookupRc(regNumber),
  ]);

  const base = { regNumber, existingCarId: existing.data?.id ?? null };
  if (!rc) return { ...base, status: "manual", values: emptyValues, rcRaw: null };
  if (rc.status !== "found") return { ...base, status: rc.status, values: emptyValues, rcRaw: null };

  const d = rc.details;
  return {
    ...base,
    status: "found",
    rcRaw: d.raw,
    values: {
      make: d.make ?? "",
      model: d.model ?? "",
      variant: d.variant ?? "",
      fuel: d.fuel ?? "",
      transmission: d.transmission ?? "",
      year: d.year?.toString() ?? "",
      owners: d.owners?.toString() ?? "",
      insurance_valid_upto: d.insurance_valid_upto ?? "",
    },
  };
}

export type CreateCarState = {
  fieldErrors?: Partial<Record<NewCarField, string>>;
  formError?: string;
};

export async function createCar(input: CarFormValues & { reg_number: string; rc_raw: Record<string, unknown> | null }): Promise<CreateCarState> {
  const t = await getT();
  const { supabase } = await getCurrentProfile();

  const parsed = newCarSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: CreateCarState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as NewCarField;
      fieldErrors[key] ??= errorText(t, issue.message);
    }
    // The number and RC data aren't editable on this step, so surface those as a form error.
    if (fieldErrors.reg_number || fieldErrors.rc_raw) return { formError: fieldErrors.reg_number ?? t.common.somethingWrong };
    return { fieldErrors };
  }

  const { rc_raw, ...car } = parsed.data;
  const { data, error } = await supabase
    .from("cars")
    .insert({ ...car, rc_raw: rc_raw as Json | null, status: "draft" })
    .select("id")
    .single();
  if (error) return { formError: t.common.somethingWrong };

  redirect(`/app/cars/${data.id}`);
}
