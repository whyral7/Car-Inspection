"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { CarIcon, ChatIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import { Plate } from "@/components/plate";
import { ScoreChip } from "@/components/score-chip";
import { whatsappShareUrl } from "@/lib/report/share";
import type { ScoreBand } from "@/lib/score";
import type { CarStatus } from "@/lib/supabase/database.types";

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
};

type Filter = "all" | "draft" | "inspected" | "published";

/** Search and filters only appear once the list is long enough to need them. */
const SEARCH_FROM = 6;

const statusTone: Record<CarStatus, string> = {
  draft: "bg-sunken text-ink",
  inspected: "bg-warning-50 text-warning-800",
  published: "bg-brand-100 text-brand-900",
};

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
    <div className="flex flex-col gap-3">
      {cars.length >= SEARCH_FROM && (
        <>
          <label className="relative block">
            <span className="sr-only">{t.dashboard.search}</span>
            <SearchIcon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.dashboard.search}
              autoCapitalize="characters"
              autoComplete="off"
              className="block min-h-12 w-full rounded-control border border-line bg-surface pr-4 pl-10 text-body placeholder:text-ink-subtle focus:border-brand-700 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </label>
          <div role="radiogroup" aria-label={t.dashboard.filterLabel} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={filter === f}
                onClick={() => setFilter(f)}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-small font-semibold ${filter === f ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-surface text-ink"}`}
              >
                {f === "all" ? t.dashboard.filterAll : t.dashboard.status[f]}
              </button>
            ))}
          </div>
        </>
      )}

      {shown.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-4 text-center text-ink-muted">{t.dashboard.noMatches}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((car) => (
            <li key={car.id} className="overflow-hidden rounded-card border border-line bg-surface">
              <Link href={`/app/cars/${car.id}`} className="flex items-center gap-3 p-3 active:bg-canvas">
                <Thumb url={car.thumbUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Plate reg={car.reg} size="sm" />
                    {car.score && <ScoreChip score={car.score.text} band={car.score.band} label={`${t.car.score} ${car.score.text}/10`} />}
                  </div>
                  {car.title && <p className="mt-1 truncate text-small font-medium text-ink">{car.title}</p>}
                  <p className={`text-small ${car.attention ? "font-medium text-warning-800" : "text-ink-muted"}`}>{car.progress}</p>
                </div>
                <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold min-[400px]:inline ${statusTone[car.status]}`}>{t.dashboard.status[car.status]}</span>
                <ChevronRightIcon size={18} className="text-ink-subtle" />
              </Link>
              {car.share && (
                <a
                  href={whatsappShareUrl(car.share.message)}
                  target="_blank"
                  rel="noopener"
                  className="flex min-h-11 items-center justify-center gap-2 border-t border-line text-small font-semibold text-whatsapp active:bg-canvas"
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

function Thumb({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <span className="flex size-16 shrink-0 items-center justify-center rounded-control bg-sunken text-ink-subtle">
        <CarIcon size={28} />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- private signed URL of the small copy, not optimisable
  return <img src={url} alt="" width={64} height={64} loading="lazy" decoding="async" onError={() => setBroken(true)} className="size-16 shrink-0 rounded-control bg-sunken object-cover" />;
}
