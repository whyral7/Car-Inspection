import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Plate } from "@/components/plate";
import { PageHeader } from "@/components/ui";
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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
      <PageHeader back={{ href: `/app/cars/${car.id}`, label: t.findings.backToCar }} title={t.car.editTitle} meta={<Plate reg={car.reg_number} size="sm" />} />
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
