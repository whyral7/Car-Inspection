import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/strings";
import { AddCarForm } from "./add-car-form";

export const metadata: Metadata = { title: t.cars.addTitle };

export default function NewCarPage() {
  return (
    <div className="mx-auto max-w-md">
      <Link href="/app" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm font-medium text-brand-700">
        ← {t.car.backToCars}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{t.cars.addTitle}</h1>
      <p className="mt-1 text-slate-600">{t.cars.addSubtitle}</p>
      <AddCarForm />
    </div>
  );
}
