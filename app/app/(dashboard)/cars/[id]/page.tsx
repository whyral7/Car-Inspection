import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { LinkButton } from "@/components/button";
import { StatusBadge } from "@/components/status-badge";
import { FUELS, TRANSMISSIONS, type Fuel, type Transmission } from "@/lib/cars";
import { checklistProgress } from "@/lib/checklist";
import { getCurrentDealer } from "@/lib/dealer";
import { carTitle, formatDate, formatDateTime, isPastDate } from "@/lib/format";
import { photoProgress } from "@/lib/photos/angles";
import { conditionScore, formatScore } from "@/lib/score";
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
  const [photosRes, findingsRes, checklistRes] = await Promise.all([
    supabase.from("inspection_photos").select("angle_key, ai_status").eq("car_id", car.id),
    supabase.from("findings").select("severity, accepted").eq("car_id", car.id),
    supabase.from("checklist_items").select("item_key, result").eq("car_id", car.id),
  ]);
  if (photosRes.error) throw photosRes.error;
  if (findingsRes.error) throw findingsRes.error;
  if (checklistRes.error) throw checklistRes.error;

  const photos = photoProgress(photosRes.data.map((p) => p.angle_key));
  const findings = findingsRes.data;
  const toReview = findings.filter((f) => !f.accepted).length;
  // Every photo has been through the AI (an unclear photo counts; the dealer decides whether to retake).
  const analysed = photos.done > 0 && photosRes.data.every((p) => p.ai_status === "done" || p.ai_status === "unclear");
  const findingsDone = analysed && toReview === 0;
  const checklist = checklistProgress(checklistRes.data.map((c) => c.item_key));
  const started = photos.done > 0 || findings.length > 0 || checklist.done > 0;
  const score = conditionScore({ findings, checklist: checklistRes.data });

  const steps = [
    {
      href: `/app/cars/${car.id}/inspect`,
      title: t.car.stepPhotos,
      status: t.car.photosTaken(photos.done, photos.total),
      done: photos.allRequiredDone,
    },
    {
      href: `/app/cars/${car.id}/findings`,
      title: t.car.stepFindings,
      status: toReview > 0 ? t.car.findingsToReview(toReview) : findings.length > 0 ? t.car.findingsAccepted(findings.length) : t.car.findingsNone,
      done: findingsDone,
      warn: toReview > 0,
    },
    {
      href: `/app/cars/${car.id}/checklist`,
      title: t.car.stepChecklist,
      status: t.car.checklistProgress(checklist.done, checklist.total),
      done: checklist.complete,
    },
    {
      href: `/app/cars/${car.id}/report`,
      title: t.car.stepReport,
      status: car.status === "published" ? t.car.reportPublished : car.status === "inspected" ? t.car.reportReady : t.car.reportLocked,
      done: car.status === "published",
    },
  ];
  // The main button points at the first unfinished step. The checklist's "Finish inspection" moves a
  // draft on to the report.
  const next = !photos.allRequiredDone
    ? { href: steps[0].href, label: photos.done === 0 ? t.car.startInspection : t.car.continueInspection }
    : !findingsDone
      ? { href: steps[1].href, label: t.car.reviewFindings }
      : !checklist.complete || car.status === "draft"
        ? { href: steps[2].href, label: t.car.fillChecklist }
        : { href: steps[3].href, label: car.status === "published" ? t.car.viewReport : t.car.previewReport };

  const insuranceExpired = car.insurance_valid_upto ? isPastDate(car.insurance_valid_upto) : false;
  const rows: { label: string; value: string | null; warn?: boolean }[] = [
    { label: t.cars.fuel, value: isFuel(car.fuel) ? t.cars.fuels[car.fuel] : car.fuel },
    { label: t.cars.transmission, value: isTransmission(car.transmission) ? t.cars.transmissions[car.transmission] : car.transmission },
    { label: t.cars.year, value: car.year?.toString() ?? null },
    { label: t.cars.owners, value: car.owners ? t.cars.ownerOrdinal(car.owners) : null },
    { label: t.car.odometer, value: car.odometer_km !== null ? t.car.km(car.odometer_km) : null },
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

      {started && (
        <section className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5" aria-label={`${t.car.score} ${formatScore(score)} ${t.car.scoreOutOf}`}>
          <p className="shrink-0 text-4xl font-bold text-brand-800">
            {formatScore(score)}
            <span className="text-base font-medium text-slate-500">{t.car.scoreOutOf}</span>
          </p>
          <div>
            <h2 className="font-semibold">{t.car.score}</h2>
            <p className="text-sm text-slate-500">{t.car.scoreHint}</p>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white">
        <h2 className="px-5 pt-4 pb-1 font-semibold">{t.car.steps}</h2>
        <ol className="divide-y divide-slate-100">
          {steps.map((step, i) => (
            <li key={step.href}>
              <Link href={step.href} className="flex min-h-16 items-center gap-3 px-5 py-3 active:bg-slate-50">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    step.done ? "bg-brand-700 text-white" : step.warn ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{step.title}</span>
                  <span className={`block text-sm ${step.warn ? "text-amber-800" : "text-slate-500"}`}>{step.status}</span>
                </span>
                <span aria-hidden="true" className="text-slate-400">›</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col gap-2">
        <LinkButton href={next.href}>{next.label}</LinkButton>
        {photos.done === 0 && <p className="text-center text-sm text-slate-500">{t.car.inspectionHint}</p>}
      </div>

      <p className="text-center text-xs text-slate-500">{t.disclaimer}</p>
    </div>
  );
}
