import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { isChecklistKey, type ChecklistKey } from "@/lib/checklist";
import { carTitle } from "@/lib/format";
import { getCurrentProfile } from "@/lib/profile";
import { t } from "@/lib/strings";
import type { ChecklistResult } from "@/lib/supabase/database.types";
import { ChecklistForm } from "./checklist-form";

export const metadata: Metadata = { title: t.checklist.title };

export default async function ChecklistPage({ params }: PageProps<"/app/cars/[id]/checklist">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase } = await getCurrentProfile();
  // RLS limits both queries to the dealer's own cars.
  const { data: car, error: carError } = await supabase.from("cars").select("id, reg_number, make, model, variant, year, status").eq("id", id).maybeSingle();
  if (carError) throw carError;
  if (!car) notFound();

  const { data: rows, error } = await supabase.from("checklist_items").select("item_key, result, note").eq("car_id", id);
  if (error) throw error;
  const initial: Partial<Record<ChecklistKey, { result: ChecklistResult; note: string }>> = {};
  for (const r of rows) if (isChecklistKey(r.item_key)) initial[r.item_key] = { result: r.result, note: r.note ?? "" };

  return <ChecklistForm carId={car.id} regNumber={car.reg_number} carTitle={carTitle(car)} finished={car.status !== "draft"} initial={initial} />;
}
