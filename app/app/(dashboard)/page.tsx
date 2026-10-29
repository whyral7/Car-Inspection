import type { Metadata } from "next";
import { FlashToast } from "@/components/flash-toast";
import { CarIcon, PlusIcon } from "@/components/icons";
import { InstallPrompt } from "@/components/install-prompt";
import { Card, EmptyState, LinkButton, PageHeader, StickyBar } from "@/components/ui";
import { PHOTO, STORAGE_BUCKETS } from "@/lib/config";
import { carTitle, formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n.server";
import { inspectionState, stepHref } from "@/lib/inspection";
import { smallPhotoPath } from "@/lib/photos/angles";
import { getCurrentProfile } from "@/lib/profile";
import { reportUrl } from "@/lib/report/share";
import { formatScore } from "@/lib/score";
import { appBaseUrl } from "@/lib/url";
import { CarList, type CarCard } from "./car-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.dashboard.myCars };
}

export default async function AppHome() {
  const t = await getT();
  const { supabase, profile } = await getCurrentProfile();
  // RLS limits every row to the user's own cars.
  const { data: carRows, error } = await supabase.from("cars").select("id, reg_number, make, model, variant, year, status, created_at").order("created_at", { ascending: false });
  if (error) throw error;
  const ids = carRows.map((c) => c.id);
  const [photosRes, findingsRes, checklistRes, reportsRes] = await Promise.all([
    supabase.from("inspection_photos").select("car_id, angle_key, ai_status").in("car_id", ids),
    supabase.from("findings").select("car_id, severity, accepted").in("car_id", ids),
    supabase.from("checklist_items").select("car_id, item_key, result").in("car_id", ids),
    supabase.from("reports").select("car_id, slug, published_at").in("car_id", ids),
  ]);
  for (const res of [photosRes, findingsRes, checklistRes, reportsRes]) if (res.error) throw res.error;
  const byCar = <T extends { car_id: string }>(rows: T[] | null) => Map.groupBy(rows ?? [], (r) => r.car_id);
  const photosByCar = byCar(photosRes.data);
  const findingsByCar = byCar(findingsRes.data);
  const checklistByCar = byCar(checklistRes.data);
  const reportByCar = new Map((reportsRes.data ?? []).map((r) => [r.car_id, r]));
  const cars = carRows.map((c) => ({
    ...c,
    inspection_photos: photosByCar.get(c.id) ?? [],
    findings: findingsByCar.get(c.id) ?? [],
    checklist_items: checklistByCar.get(c.id) ?? [],
    report: reportByCar.get(c.id) ?? null,
  }));

  // Small front photo for each card. A car without one (or whose small copy failed) shows an icon.
  const withFront = cars.filter((c) => c.inspection_photos.some((p) => p.angle_key === "front"));
  const thumbs = new Map<string, string>();
  if (withFront.length > 0) {
    const { data: signed } = await supabase.storage.from(STORAGE_BUCKETS.inspectionPhotos).createSignedUrls(
      withFront.map((c) => smallPhotoPath(c.id, "front")),
      PHOTO.signedUrlSeconds,
    );
    for (const s of signed ?? []) if (s.path && s.signedUrl && !s.error) thumbs.set(s.path, s.signedUrl);
  }

  const baseUrl = await appBaseUrl();
  const cards: CarCard[] = cars.map((car) => {
    const state = inspectionState({ status: car.status, photos: car.inspection_photos, findings: car.findings, checklist: car.checklist_items });
    const report = car.report;
    const title = carTitle(car);
    const published = car.status === "published" && report?.published_at ? report : null;
    const progress =
      car.status === "published" && report?.published_at
        ? t.dashboard.progress.published(formatDateTime(report.published_at))
        : car.status === "inspected"
          ? t.dashboard.progress.ready
          : state.next === "photos"
            ? t.dashboard.progress.photos(state.photos.done, state.photos.total)
            : state.next === "findings"
              ? state.toReview > 0
                ? t.car.findingsToReview(state.toReview)
                : t.dashboard.progress.checking
              : t.dashboard.progress.checklist(state.checklist.done, state.checklist.total);
    const scoreText = state.score ? formatScore(state.score.value) : null;
    const url = published ? reportUrl(baseUrl, published.slug) : null;
    return {
      id: car.id,
      reg: car.reg_number,
      title,
      status: car.status,
      progress,
      attention: state.toReview > 0,
      next: car.status === "published" ? null : { step: state.next, href: stepHref(car.id, state.next), stepsDone: state.stepsDone },
      thumbUrl: thumbs.get(smallPhotoPath(car.id, "front")) ?? null,
      score: state.score && !state.score.provisional ? { text: scoreText!, band: state.score.band } : null,
      share: url ? { url, message: t.report.shareMessage(title || car.reg_number, car.reg_number, scoreText ?? "", url) } : null,
    };
  });
  const anyPublished = cards.some((c) => c.status === "published");
  const noCredits = profile.credits < 1;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <FlashToast param="deleted" message={t.car.deleted} />
      <PageHeader title={t.dashboard.myCars} meta={cards.length > 0 ? t.dashboard.carCount(cards.length) : undefined} />

      {noCredits && (
        <Card tone="warning" className="flex flex-col gap-4">
          <div>
            <p className="font-semibold text-warning-800">{t.dashboard.noCreditsTitle}</p>
            <p className="mt-1 text-small text-warning-800">{t.dashboard.noCreditsBody}</p>
          </div>
          <LinkButton href="/app/credits" size="sm" className="self-start">
            {t.profile.buy}
          </LinkButton>
        </Card>
      )}

      <InstallPrompt eligible={anyPublished} />

      {cards.length === 0 ? (
        <EmptyState icon={<CarIcon size={24} />} title={t.dashboard.emptyTitle} body={t.dashboard.emptyBody}>
          <ol className="flex flex-col gap-2 text-left">
            {t.dashboard.emptySteps.map((step, i) => (
              <li key={step} className="flex items-center gap-4 rounded-control bg-canvas px-4 py-2 text-small">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-caption font-semibold text-white">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </EmptyState>
      ) : (
        <CarList cars={cards} />
      )}

      <StickyBar>
        <LinkButton href="/app/cars/new" icon={<PlusIcon />}>
          {t.dashboard.addCar}
        </LinkButton>
      </StickyBar>
    </div>
  );
}
