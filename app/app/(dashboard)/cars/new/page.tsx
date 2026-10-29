import type { Metadata } from "next";
import { BackLink } from "@/components/button";
import { getT } from "@/lib/i18n.server";
import { AddCarForm } from "./add-car-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.cars.addTitle };
}

export default async function NewCarPage() {
  const t = await getT();
  return (
    <div className="mx-auto flex max-w-md flex-col">
      <BackLink href="/app">{t.car.backToCars}</BackLink>
      <h1 className="mt-2 text-2xl font-bold">{t.cars.addTitle}</h1>
      <p className="mt-1 text-slate-700">{t.cars.addSubtitle}</p>
      <AddCarForm />
    </div>
  );
}
