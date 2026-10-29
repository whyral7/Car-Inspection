import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { getT } from "@/lib/i18n.server";
import { AddCarForm } from "./add-car-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.cars.addTitle };
}

export default async function NewCarPage() {
  const t = await getT();
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
      <PageHeader back={{ href: "/app", label: t.car.backToCars }} title={t.cars.addTitle} description={t.cars.addSubtitle} />
      <AddCarForm />
    </div>
  );
}
