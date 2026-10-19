import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { LinkButton } from "@/components/button";
import { StatusBadge } from "@/components/status-badge";
import { FUELS, TRANSMISSIONS, type Fuel, type Transmission } from "@/lib/cars";
import { getCurrentDealer } from "@/lib/dealer";
import { carTitle, formatDate, formatDateTime, isPastDate } from "@/lib/format";
import { ANGLES } from "@/lib/photos/angles";
import { t } from "@/lib/strings";

const getCar = cache(async (id: string) => {
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await getCurrentDealer();
  // RLS limits this to the dealer's own cars, so someone else's id is simply not found.
  const { data: car, error } = await supabase.from("cars").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!car) notFound();
  return car;
});

export async function generateMetadata({ params }: PageProps<"/app/cars/[id]">): Promise<Metadata> {
  const car = await getCar((await params).id);
  return { title: car.reg_number };
}

const isFuel = (v: string | null): v is Fuel => (FUELS as readonly string[]).includes(v ?? "");
const isTransmission = (v: string | null): v is Transmission => (TRANSMISSIONS as readonly string[]).includes(v ?? "");

export default async function CarPage({ params }: PageProps<"/app/cars/[id]">) {
  const { id } = await params;
  const car = await getCar(id);
  const { supabase } = await getCurrentDealer();
  const { count: photoCount, error: photoError } = await supabase.from("inspection_photos").select("id", { count: "exact", head: true }).eq("car_id", car.id);
  if (photoError) throw photoError;
  const photosTaken = photoCount ?? 0;

  const insuranceExpired = car.insurance_valid_upto ? isPastDate(car.insurance_valid_upto) : false;
  const rows: { label: string; value: string | null; warn?: boolean }[] = [
    { label: t.cars.fuel, value: isFuel(car.fuel) ? t.cars.fuels[car.fuel] : car.fuel },
    { label: t.cars.transmission, value: isTransmission(car.transmission) ? t.cars.transmissions[car.transmission] : car.transmission },
    { label: t.cars.year, value: car.year?.toString() ?? null },
    { label: t.cars.owners, value: car.owners ? t.cars.ownerOrdinal(car.owners) : null },
    {
      label: t.cars.insurance,
      value: car.insurance_valid_upto && `${formatDate(car.insurance_valid_upto)}${insuranceExpired ? ` (${t.car.expired})` : ""}`,
      warn: insuranceExpired,
    },
    { label: t.car.addedOn, value: formatDateTime(car.created_at) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/app" className="-ml-1 inline-flex min-h-11 items-center self-start px-1 text-sm font-medium text-brand-700">
        ← {t.car.backToCars}
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-2xl font-bold tracking-widest">{car.reg_number}</p>
          <StatusBadge status={car.status} />
        </div>
        <h1 className="mt-1 text-lg text-slate-700">{carTitle(car)}</h1>
        <p className="mt-1 text-xs text-slate-500">{car.rc_raw ? t.car.fromRc : t.car.enteredManually}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 font-semibold">{t.car.details}</h2>
        <dl className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 py-2.5 text-sm">
              <dt className="text-slate-600">{row.label}</dt>
              <dd className={`text-right font-medium ${row.warn ? "text-red-600" : row.value ? "" : "text-slate-400"}`}>{row.value ?? t.car.notSet}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-col gap-2">
        <LinkButton href={`/app/cars/${car.id}/inspect`}>{car.status === "draft" && photosTaken === 0 ? t.car.startInspection : t.car.continueInspection}</LinkButton>
        {photosTaken > 0 && <p className="text-center text-sm font-medium text-slate-700">{t.car.photosTaken(photosTaken, ANGLES.length)}</p>}
        <p className="text-center text-sm text-slate-500">{t.car.inspectionHint}</p>
      </div>

      <p className="text-center text-xs text-slate-500">{t.disclaimer}</p>
    </div>
  );
}
