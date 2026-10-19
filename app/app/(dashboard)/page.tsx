import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/button";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentDealer } from "@/lib/dealer";
import { carTitle } from "@/lib/format";
import { t } from "@/lib/strings";

export const metadata: Metadata = { title: t.dashboard.myCars };

export default async function AppHome() {
  const { supabase, dealer } = await getCurrentDealer();
  const { data: cars, error } = await supabase
    .from("cars")
    .select("id, reg_number, make, model, year, status")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center justify-between rounded-2xl bg-brand-700 p-5 text-white">
        <div>
          <p className="text-sm text-brand-100">{t.dashboard.credits}</p>
          <p className="text-3xl font-bold">{dealer.credits}</p>
        </div>
        <p className="max-w-[45%] text-right text-sm text-brand-100">{t.dashboard.creditsHint}</p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">{t.dashboard.myCars}</h1>
          {cars.length > 0 && (
            <LinkButton href="/app/cars/new" className="min-h-11 px-4 text-sm">
              + {t.dashboard.addCar}
            </LinkButton>
          )}
        </div>

        {cars.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <span className="text-5xl" aria-hidden>
              🚗
            </span>
            <h2 className="mt-4 text-lg font-semibold">{t.dashboard.emptyTitle}</h2>
            <p className="mt-1 max-w-xs text-slate-600">{t.dashboard.emptyBody}</p>
            <LinkButton href="/app/cars/new" className="mt-6 w-full max-w-xs">
              + {t.dashboard.addCar}
            </LinkButton>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {cars.map((car) => (
              <li key={car.id}>
                <Link
                  href={`/app/cars/${car.id}`}
                  className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="font-semibold tracking-wide">{car.reg_number}</p>
                    <p className="truncate text-sm text-slate-600">{carTitle(car)}</p>
                  </div>
                  <StatusBadge status={car.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-slate-500">{t.disclaimer}</p>
    </div>
  );
}
