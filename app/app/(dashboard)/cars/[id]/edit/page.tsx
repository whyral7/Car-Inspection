import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BackLink } from "@/components/button";
import { Plate } from "@/components/plate";
import { getT } from "@/lib/i18n.server";
import { getCurrentProfile } from "@/lib/profile";
import { EditCarForm } from "./edit-car-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.car.editTitle };
}

export default async function EditCarPage({ params }: PageProps<"/app/cars/[id]/edit">) {
  const t = await getT();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await getCurrentProfile();
  const { data: car, error } = await supabase.from("cars").select("id, reg_number, make, model, variant, fuel, transmission, year, owners, insurance_valid_upto").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!car) notFound();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-2">
      <BackLink href={`/app/cars/${car.id}`}>{t.findings.backToCar}</BackLink>
      <h1 className="text-2xl font-bold">{t.car.editTitle}</h1>
      <Plate reg={car.reg_number} className="self-start" />
      <EditCarForm
        carId={car.id}
        values={{
          make: car.make ?? "",
          model: car.model ?? "",
          variant: car.variant ?? "",
          fuel: car.fuel ?? "",
          transmission: car.transmission ?? "",
          year: car.year?.toString() ?? "",
          owners: car.owners?.toString() ?? "",
          insurance_valid_upto: car.insurance_valid_upto ?? "",
        }}
      />
    </div>
  );
}
