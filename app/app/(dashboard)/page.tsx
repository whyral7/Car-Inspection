import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/button";
import { StatusBadge } from "@/components/status-badge";
import { carTitle } from "@/lib/format";
import { getCurrentProfile } from "@/lib/profile";
import { t } from "@/lib/strings";

export const metadata: Metadata = { title: t.dashboard.myCars };

export default async function AppHome() {
  const { supabase, profile } = await getCurrentProfile();
  const { data: cars, error } = await supabase
    .from("cars")
    .select("id, reg_number, make, model, year, status")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
        <div>
          <p className="type-overline uppercase tracking-[0.06em] text-text-subtle">{t.dashboard.credits}</p>
          <p className="font-mono text-3xl font-medium text-text">{profile.credits}</p>
        </div>
        <p className="max-w-[55%] text-right type-caption text-text-muted">{t.dashboard.creditsHint}</p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="type-heading-1">{t.dashboard.myCars}</h1>
          {cars.length > 0 && (
            <LinkButton href="/app/cars/new" className="min-h-11 px-4 text-sm">
              + {t.dashboard.addCar}
            </LinkButton>
          )}
        </div>

        {cars.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border-control bg-surface px-6 py-12 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
            <img src="/brand/treadmark-mark-small-color.svg" alt="" width={56} height={56} className="size-14" />
            <h2 className="mt-4 text-lg font-semibold">{t.dashboard.emptyTitle}</h2>
            <p className="mt-1 max-w-xs text-text-muted">{t.dashboard.emptyBody}</p>
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
                  className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 active:bg-bg"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-medium tracking-[0.08em]">{car.reg_number}</p>
                    <p className="truncate text-sm text-text-muted">{carTitle(car)}</p>
                  </div>
                  <StatusBadge status={car.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-text-subtle">{t.disclaimer}</p>
    </div>
  );
}
