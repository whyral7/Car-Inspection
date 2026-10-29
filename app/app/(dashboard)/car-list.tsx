"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { ArrowRightIcon, CarIcon, ChatIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import { Plate } from "@/components/plate";
import { ScoreChip } from "@/components/score-chip";
import { StatusBadge } from "@/components/status-badge";
import { Card, LinkButton, ProgressBar } from "@/components/ui";
import { stepHref, type InspectionStep } from "@/lib/inspection";
import { whatsappShareUrl } from "@/lib/report/share";
import { useLastStep } from "@/lib/resume";
import type { ScoreBand } from "@/lib/score";
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
  score: { text: string; band: ScoreBand } | null;
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

  return (
    <div className="flex flex-col gap-6">
      <Resume cars={cars} />

      {cars.length >= SEARCH_FROM && (
        <div className="flex flex-col gap-4">
          <label className="relative block">
            <span className="sr-only">{t.dashboard.search}</span>
            <SearchIcon size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.dashboard.search}
              autoCapitalize="characters"
              autoComplete="off"
              enterKeyHint="search"
              className="block min-h-12 w-full rounded-control bg-surface pr-4 pl-12 text-body shadow-card ring-1 ring-line transition-shadow ring-inset placeholder:text-ink-subtle focus:shadow-focus focus:ring-brand-700 focus:outline-none"
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
                className={`min-h-11 shrink-0 rounded-full px-4 text-small font-semibold transition-colors ${
                  filter === f ? "bg-ink text-white" : "bg-surface text-ink-muted shadow-card hover:text-ink"
                }`}
              >
                {f === "all" ? t.dashboard.filterAll : t.dashboard.status[f]}
              </button>
            ))}
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <Card className="text-center text-ink-muted">{t.dashboard.noMatches}</Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {shown.map((car) => (
            <li key={car.id} className="overflow-hidden rounded-card bg-surface shadow-card">
              <Link href={`/app/cars/${car.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-canvas active:bg-sunken">
                <Thumb url={car.thumbUrl} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Plate reg={car.reg} size="sm" />
                    {car.score && <ScoreChip score={car.score.text} band={car.score.band} label={`${t.car.score} ${car.score.text}/10`} />}
                  </div>
                  {car.title && <p className="line-clamp-2 font-medium break-words">{car.title}</p>}
                  <p className={`text-small ${car.attention ? "font-medium text-warning-700" : "text-ink-muted"}`}>{car.progress}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden min-[420px]:inline-flex">
                    <StatusBadge status={car.status} t={t} />
                  </span>
                  <ChevronRightIcon size={20} className="text-ink-subtle" />
                </div>
              </Link>
              {car.share && (
                <a
                  href={whatsappShareUrl(car.share.message)}
                  target="_blank"
                  rel="noopener"
                  className="flex min-h-12 items-center justify-center gap-2 border-t border-line text-small font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  <ChatIcon size={18} />
                  {t.dashboard.shareAgain}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * "Pick up where you left off": the inspection last opened on this phone (or, failing that, the
 * newest unfinished car), with one button straight back to that screen.
 */
function Resume({ cars }: { cars: CarCard[] }) {
  const t = useT();
  const last = useLastStep();

  const open = cars.filter((c) => c.next);
  const remembered = last ? open.find((c) => c.id === last.carId) : undefined;
  const car = remembered ?? open[0];
  if (!car?.next) return null;
  // Resume the remembered screen, unless the car has since moved past it.
  const order: InspectionStep[] = ["photos", "findings", "checklist", "report"];
  const step = remembered && last && order.indexOf(last.step) >= order.indexOf(car.next.step) ? last.step : car.next.step;

  return (
    <section aria-labelledby="resume-title" className="flex animate-rise-in flex-col gap-4 rounded-card bg-brand-800 p-4 text-white shadow-raised sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="resume-title" className="text-caption font-semibold tracking-wide text-brand-100 uppercase">
            {t.dashboard.resumeTitle}
          </h2>
          <p className="text-heading break-words">
            <span className="tabular tracking-wider">{car.reg}</span>
            {car.title && <span className="font-normal text-brand-100"> · {car.title}</span>}
          </p>
        </div>
        <Thumb url={car.thumbUrl} size="sm" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-4 text-small text-brand-100">
          <span>{car.progress}</span>
          <span className="tabular">{t.dashboard.stepsDone(car.next.stepsDone)}</span>
        </div>
        <ProgressBar value={car.next.stepsDone} max={4} label={t.dashboard.stepsDone(car.next.stepsDone)} className="!bg-white/15 [&>div]:!bg-white" />
      </div>
      <LinkButton href={stepHref(car.id, step)} variant="secondary" className="!bg-white !text-brand-800 !ring-0">
        {t.dashboard.continueStep(stepLabel(t, step))}
        <ArrowRightIcon size={18} />
      </LinkButton>
    </section>
  );
}

function Thumb({ url, size = "md" }: { url: string | null; size?: "sm" | "md" }) {
  const [broken, setBroken] = useState(false);
  const box = size === "sm" ? "size-12" : "size-16";
  if (!url || broken) {
    return (
      <span className={`flex ${box} shrink-0 items-center justify-center rounded-control bg-sunken text-ink-subtle`}>
        <CarIcon size={size === "sm" ? 22 : 28} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- private signed URL of the small copy, not optimisable
    <img src={url} alt="" width={64} height={64} loading="lazy" decoding="async" onError={() => setBroken(true)} className={`${box} shrink-0 rounded-control bg-sunken object-cover`} />
  );
}
