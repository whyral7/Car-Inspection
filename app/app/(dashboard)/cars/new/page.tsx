import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/strings";
import { AddCarForm } from "./add-car-form";

export const metadata: Metadata = { title: t.cars.addTitle };

export default function NewCarPage() {
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
