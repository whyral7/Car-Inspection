import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { DeleteCar } from "@/components/delete-car";
import { FlashToast } from "@/components/flash-toast";
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, PencilIcon } from "@/components/icons";
import { Plate } from "@/components/plate";
import { BAND_STYLE } from "@/components/score-chip";
import { StatusBadge } from "@/components/status-badge";
import { BackLink, Card, ListCard, ListRow, LinkButton, StickyBar } from "@/components/ui";
import { isFuel, isTransmission } from "@/lib/cars";
import { carTitle, formatDate, formatDateTime, isPastDate } from "@/lib/format";
import { getT } from "@/lib/i18n.server";
import { inspectionState, type InspectionStep } from "@/lib/inspection";
import { getCurrentProfile } from "@/lib/profile";
import { formatScore } from "@/lib/score";

const getCar = cache(async (id: string) => {
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await getCurrentProfile();
  // RLS limits this to the user's own cars, so someone else's id is simply not found.
  const { data: car, error } = await supabase.from("cars").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!car) notFound();
  return car;
});

export async function generateMetadata({ params }: PageProps<"/app/cars/[id]">): Promise<Metadata> {
  const car = await getCar((await params).id);
  return { title: car.reg_number };
}

export default async function CarPage({ params }: PageProps<"/app/cars/[id]">) {
  const t = await getT();
  const { id } = await params;
  const car = await getCar(id);
  const { supabase } = await getCurrentProfile();
  const [photosRes, findingsRes, checklistRes] = await Promise.all([
    supabase.from("inspection_photos").select("angle_key, ai_status").eq("car_id", car.id),
    supabase.from("findings").select("severity, accepted").eq("car_id", car.id),
    supabase.from("checklist_items").select("item_key, result").eq("car_id", car.id),
  ]);
  if (photosRes.error) throw photosRes.error;
  if (findingsRes.error) throw findingsRes.error;
  if (checklistRes.error) throw checklistRes.error;

  const state = inspectionState({ status: car.status, photos: photosRes.data, findings: findingsRes.data, checklist: checklistRes.data });
  const findingsCount = findingsRes.data.length;
  const base = `/app/cars/${car.id}`;

  const steps: { key: InspectionStep; href: string; title: string; status: string; done: boolean; warn?: boolean }[] = [
    { key: "photos", href: `${base}/inspect`, title: t.car.stepPhotos, status: t.car.photosTaken(state.photos.done, state.photos.total), done: state.photos.allRequiredDone },
    {
      key: "findings",
      href: `${base}/findings`,
      title: t.car.stepFindings,
      status: state.toReview > 0 ? t.car.findingsToReview(state.toReview) : findingsCount > 0 ? t.car.findingsAccepted(findingsCount) : t.car.findingsNone,
      done: state.findingsDone,
      warn: state.toReview > 0,
    },
    { key: "checklist", href: `${base}/checklist`, title: t.car.stepChecklist, status: t.car.checklistProgress(state.checklist.done, state.checklist.total), done: car.status !== "draft" },
    {
      key: "report",
      href: `${base}/report`,
      title: t.car.stepReport,
      status: car.status === "published" ? t.car.reportPublished : car.status === "inspected" ? t.car.reportReady : t.car.reportLocked,
      done: car.status === "published",
    },
  ];

  const nextLabel: Record<InspectionStep, string> = {
    photos: state.photos.done === 0 ? t.car.startInspection : t.car.continueInspection,
    findings: t.car.reviewFindings,
    checklist: t.car.fillChecklist,
    report: car.status === "published" ? t.car.viewReport : t.car.previewReport,
  };
  const nextHref = steps.find((s) => s.key === state.next)!.href;

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
    <div className="flex flex-1 flex-col gap-6">
      <FlashToast param="saved" message={t.car.saved} />
      <FlashToast param="added" message={t.car.added} />
      <header className="flex flex-col gap-4">
        <BackLink href="/app">{t.car.backToCars}</BackLink>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Plate reg={car.reg_number} size="lg" />
          <StatusBadge status={car.status} t={t} />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-title break-words">{carTitle(car) || car.reg_number}</h1>
          <p className="text-small text-ink-muted">{car.rc_raw ? t.car.fromRc : t.car.enteredManually}</p>
        </div>
      </header>

      {state.score && (
        <Card
          tone={state.score.band === "good" ? "success" : state.score.band === "fair" ? "warning" : "danger"}
          className="flex items-center gap-6"
          aria-label={`${t.car.score} ${formatScore(state.score.value)} ${t.car.scoreOutOf}`}
        >
          <p className={`shrink-0 text-display tabular ${BAND_STYLE[state.score.band].text}`}>
            {formatScore(state.score.value)}
            <span className="text-body font-semibold">{t.car.scoreOutOf}</span>
          </p>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-semibold">
              {t.car.score} · <span className={BAND_STYLE[state.score.band].text}>{t.publicReport.bands[state.score.band]}</span>
            </h2>
            <p className="text-small text-ink-muted">{state.score.provisional ? t.car.scoreProvisional(state.checklist.done, state.checklist.total) : t.car.scoreHint}</p>
          </div>
        </Card>
      )}

      <section aria-labelledby="steps-title" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4 px-1">
          <h2 id="steps-title" className="text-heading">
            {t.car.steps}
          </h2>
          <p className="text-small text-ink-muted tabular">{t.car.stepsDone(state.stepsDone)}</p>
        </div>
        <ListCard>
          {steps.map((step, i) => {
            const current = step.key === state.next && !step.done;
            return (
              <ListRow
                key={step.key}
                href={step.href}
                highlight={current}
                leading={
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-small font-semibold ${
                      step.done ? "bg-brand-700 text-white" : step.warn ? "bg-warning-50 text-warning-800" : current ? "text-brand-800 ring-2 ring-brand-700 ring-inset" : "bg-sunken text-ink-muted"
                    }`}
                  >
                    {step.done ? <CheckIcon size={16} /> : i + 1}
                  </span>
                }
                title={step.title}
                subtitle={<span className={step.warn ? "font-medium text-warning-700" : undefined}>{step.status}</span>}
              />
            );
          })}
        </ListCard>
      </section>

      <details className="group rounded-card bg-surface shadow-card">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-4 font-semibold transition-colors hover:bg-canvas sm:px-6 [&::-webkit-details-marker]:hidden">
          {t.car.details}
          <ChevronDownIcon size={20} className="text-ink-subtle transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <dl className="divide-y divide-line border-t border-line px-4 sm:px-6">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap justify-between gap-x-4 py-3 text-small">
              <dt className="text-ink-muted">{row.label}</dt>
              <dd className={`text-right font-medium ${row.warn ? "text-danger-700" : row.value ? "" : "text-ink-subtle"}`}>{row.value ?? t.car.notSet}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-line px-4 py-2 sm:px-6">
          <Link href={`${base}/edit`} className="-mx-2 inline-flex min-h-11 items-center gap-2 rounded-chip px-2 text-small font-semibold text-brand-700 transition-colors hover:bg-brand-50">
            <PencilIcon size={16} />
            {t.car.editDetails}
          </Link>
        </div>
      </details>

      <DeleteCar carId={car.id} regNumber={car.reg_number} published={car.status === "published"} />

      {/* The next step stays in thumb reach, whatever else is on the page. */}
      <StickyBar>
        <LinkButton href={nextHref}>
          {nextLabel[state.next]}
          <ArrowRightIcon size={20} />
        </LinkButton>
        <p className="text-center text-caption text-ink-muted">{t.car.nextHint[state.next]}</p>
      </StickyBar>
    </div>
  );
}
