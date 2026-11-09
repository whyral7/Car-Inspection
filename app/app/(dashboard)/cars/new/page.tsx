import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n.server";
import { AddCarForm } from "./add-car-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.cars.addTitle };
}

export default async function NewCarPage() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-md">
      <Link href="/app" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm font-medium text-accent">
        ← {t.car.backToCars}
      </Link>
      <h1 className="mt-2 type-heading-1">{t.cars.addTitle}</h1>
      <p className="mt-1 text-text-muted">{t.cars.addSubtitle}</p>
      <AddCarForm />
    </div>
  );
}
