"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { ArrowRightIcon, CarIcon, ChatIcon, ChevronRightIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { Plate } from "@/components/plate";
import { ScoreChip } from "@/components/score-meter";
import { StatusBadge } from "@/components/status-badge";
import { Card, LinkButton, ProgressBar, StickyBar, inputClass } from "@/components/ui";
import { stepHref, type InspectionStep } from "@/lib/inspection";
import { whatsappShareUrl } from "@/lib/report/share";
import { useLastStep } from "@/lib/resume";
import type { CarStatus } from "@/lib/supabase/database.types";
import type { Strings } from "@/lib/strings";

export type CarCard = {
  id: string;
  reg: string;
  title: string;
  status: CarStatus;
  /** One line on where the inspection is: "Photos 8 of 20", "Ready to publish"… */
  progress: string;
  attention: boolean;
  thumbUrl: string | null;
  score: { text: string; value: number } | null;
  share: { url: string; message: string } | null;
  /** Unfinished cars only: the first unfinished step. */
  next: { step: InspectionStep; href: string; stepsDone: number } | null;
};

type Filter = "all" | "draft" | "inspected" | "published";

/** Search and filters only appear once the list is long enough to need them. */
const SEARCH_FROM = 6;

const stepLabel = (t: Strings, step: InspectionStep) =>
  ({ photos: t.car.stepPhotos, findings: t.car.stepFindings, checklist: t.car.stepChecklist, report: t.car.stepReport })[step];

export function CarList({ cars }: { cars: CarCard[] }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const q = query.trim().toUpperCase().replace(/\s+/g, "");
  const shown = cars.filter(
    (c) => (filter === "all" || c.status === filter) && (!q || c.reg.includes(q) || c.title.toUpperCase().replace(/\s+/g, "").includes(q)),
  );
  const filters: Filter[] = ["all", "draft", "inspected", "published"];
  const resume = useResume(cars);

  return (
    <div className="flex flex-1 flex-col gap-6">
      {resume && <Resume resume={resume} />}

      {cars.length >= SEARCH_FROM && (
        <div className="flex flex-col gap-4">
          <label className="relative block">
            <span className="sr-only">{t.dashboard.search}</span>
            <SearchIcon size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-subtle" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.dashboard.search}
              autoCapitalize="characters"
              autoComplete="off"
              enterKeyHint="search"
              className={`${inputClass} pl-12`}
            />
          </label>
          <div role="radiogroup" aria-label={t.dashboard.filterLabel} className="-mx-4 flex gap-2 overflow-x-auto px-4">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={filter === f}
                onClick={() => setFilter(f)}
                className={`min-h-11 shrink-0 rounded-md border px-4 type-label transition-colors ${
                  filter === f ? "border-accent bg-accent-tint text-text" : "border-border-control bg-surface text-text-muted hover:text-text"
                }`}
              >
                {f === "all" ? t.dashboard.filterAll : t.dashboard.status[f]}
              </button>
            ))}
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <Card className="text-center text-text-muted">{t.dashboard.noMatches}</Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {shown.map((car) => (
            <li key={car.id} className="overflow-hidden rounded-lg bg-surface shadow-card">
              <Link href={`/app/cars/${car.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-sunken active:bg-surface-sunken">
                <Thumb url={car.thumbUrl} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Plate reg={car.reg} size="sm" />
                    {car.score && <ScoreChip score={car.score.value} scoreText={car.score.text} outOf={t.car.scoreOutOf} label={`${t.car.score} ${car.score.text}${t.car.scoreOutOf}`} />}
                  </div>
                  {car.title && <p className="line-clamp-2 type-title-sm break-words">{car.title}</p>}
                  <p className={car.attention ? "type-label text-text" : "type-body-sm text-text-muted"}>{car.progress}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden min-[420px]:inline-flex">
                    <StatusBadge status={car.status} t={t} />
                  </span>
                  <ChevronRightIcon size={20} className="text-text-subtle" />
                </div>
              </Link>
              {car.share && (
                <a
                  href={whatsappShareUrl(car.share.message)}
                  target="_blank"
                  rel="noopener"
                  className="flex min-h-12 items-center justify-center gap-2 border-t border-border type-label text-button-ghost-fg transition-colors hover:bg-button-ghost-bg-hover"
                >
                  <ChatIcon size={18} />
                  {t.dashboard.shareAgain}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* One primary action: carry on with the open inspection if there is one, otherwise add a car. */}
      <StickyBar className="flex-row">
        {resume ? (
          <>
            <LinkButton href="/app/cars/new" variant="secondary" icon={<PlusIcon />} aria-label={t.dashboard.addCar} className="shrink-0 !px-4">
              <span className="max-[380px]:sr-only">{t.dashboard.addCar}</span>
            </LinkButton>
            <LinkButton href={resume.href} className="min-w-0 flex-1">
              <span className="truncate">{t.dashboard.continueStep(stepLabel(t, resume.step))}</span>
              <ArrowRightIcon size={18} />
            </LinkButton>
          </>
        ) : (
          <LinkButton href="/app/cars/new" icon={<PlusIcon />} className="flex-1">
            {t.dashboard.addCar}
          </LinkButton>
        )}
      </StickyBar>
    </div>
  );
}

/** The inspection to pick up again: the one last opened on this phone, else the newest unfinished car. */
function useResume(cars: CarCard[]) {
  const last = useLastStep();
  const open = cars.filter((c) => c.next);
  const remembered = last ? open.find((c) => c.id === last.carId) : undefined;
  const car = remembered ?? open[0];
  if (!car?.next) return null;
  // Resume the remembered screen, unless the car has since moved past it.
  const order: InspectionStep[] = ["photos", "findings", "checklist", "report"];
  const step = remembered && last && order.indexOf(last.step) >= order.indexOf(car.next.step) ? last.step : car.next.step;
  return { car, next: car.next, step, href: stepHref(car.id, step) };
}

/** "Pick up where you left off": a plain card that opens the inspection where it stopped. The button is in the bottom bar. */
function Resume({ resume }: { resume: NonNullable<ReturnType<typeof useResume>> }) {
  const t = useT();
  const { car, next, href } = resume;
  return (
    <section aria-labelledby="resume-title" className="animate-rise-in overflow-hidden rounded-lg bg-surface shadow-card">
      <Link href={href} className="flex flex-col gap-3 p-4 transition-colors hover:bg-surface-sunken sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 id="resume-title" className="caps type-overline text-text-subtle">
              {t.dashboard.resumeTitle}
            </h2>
            <Plate reg={car.reg} size="sm" className="self-start" />
            {car.title && <p className="type-title-sm break-words">{car.title}</p>}
          </div>
          <Thumb url={car.thumbUrl} size="sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-4 type-caption text-text-muted">
            <span>{car.progress}</span>
            <span className="tabular">{t.dashboard.stepsDone(next.stepsDone)}</span>
          </div>
          <ProgressBar value={next.stepsDone} max={4} size="sm" label={t.dashboard.stepsDone(next.stepsDone)} />
        </div>
      </Link>
    </section>
  );
}

function Thumb({ url, size = "md" }: { url: string | null; size?: "sm" | "md" }) {
  const [broken, setBroken] = useState(false);
  const box = size === "sm" ? "size-12" : "size-16";
  if (!url || broken) {
    return (
      <span className={`flex ${box} shrink-0 items-center justify-center rounded-md bg-surface-sunken text-text-subtle`}>
        <CarIcon size={size === "sm" ? 22 : 28} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- private signed URL of the small copy, not optimisable
    <img src={url} alt="" width={64} height={64} loading="lazy" decoding="async" onError={() => setBroken(true)} className={`${box} shrink-0 rounded-md bg-surface-sunken object-cover`} />
  );
}
