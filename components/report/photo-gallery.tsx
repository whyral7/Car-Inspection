"use client";

import { useRef, useState, type TouchEvent } from "react";
import { useT } from "@/components/i18n-provider";
import { ChevronLeftIcon, ChevronRightIcon, XIcon, ZoomInIcon } from "@/components/icons";
import type { ReportPhoto } from "@/lib/report/view";

/** Full-screen viewer shared by the hero carousel and the grid: swipe or arrows, tap to zoom. */
function usePhotoViewer(photos: ReportPhoto[]) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  function open(i: number) {
    setIndex(i);
    setZoomed(false);
    dialog.current?.showModal();
  }

  function step(delta: number) {
    setZoomed(false);
    setIndex((i) => (i + delta + photos.length) % photos.length);
  }

  return { dialog, index, zoomed, setZoomed, open, step };
}

function PhotoViewer({ photos, viewer }: { photos: ReportPhoto[]; viewer: ReturnType<typeof usePhotoViewer> }) {
  const t = useT();
  const touchX = useRef<number | null>(null);
  const { dialog, index, zoomed, setZoomed, step } = viewer;
  const photo = photos[index];

  function onTouchEnd(e: TouchEvent) {
    const start = touchX.current;
    touchX.current = null;
    // While zoomed, a swipe pans the photo instead of changing it.
    if (start === null || zoomed) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  }

  return (
    <dialog
      ref={dialog}
      aria-label={t.publicReport.photoViewer}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 text-white backdrop:bg-black"
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
    >
      {photo && (
        <div className="flex h-full flex-col" onTouchStart={(e) => (touchX.current = e.touches[0].clientX)} onTouchEnd={onTouchEnd}>
          <div className="flex items-center justify-between gap-3 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2">
            <div className="min-w-0 text-sm">
              <p className="truncate">
                <span className="font-semibold">{photo.label}</span>
                <span className="text-white/75"> · {t.publicReport.photoPosition(index + 1, photos.length)}</span>
              </p>
              {photo.takenAt && <p className="text-xs text-white/75">{t.publicReport.photoTaken(photo.takenAt)}</p>}
            </div>
            <button type="button" onClick={() => dialog.current?.close()} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold active:bg-white/10">
              <XIcon size={18} />
              {t.publicReport.close}
            </button>
          </div>
          <div className={`relative min-h-0 flex-1 ${zoomed ? "overflow-auto" : "flex items-center justify-center overflow-hidden"}`}>
            <button type="button" onClick={() => setZoomed(!zoomed)} aria-label={zoomed ? t.publicReport.zoomOut : t.publicReport.zoomIn} className={zoomed ? "block" : "flex h-full w-full items-center justify-center"}>
              {/* eslint-disable-next-line @next/next/no-img-element -- full-size signed storage URL */}
              <img
                key={photo.key}
                src={photo.url}
                alt={photo.label}
                className={zoomed ? "max-w-none" : "max-h-full max-w-full object-contain"}
                style={zoomed ? { width: "250%" } : undefined}
              />
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {photos.length > 1 ? (
              <button type="button" onClick={() => step(-1)} aria-label={t.publicReport.previous} className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-white/10 active:bg-white/20">
                <ChevronLeftIcon size={24} />
              </button>
            ) : (
              <span className="flex-1" />
            )}
            <button type="button" onClick={() => setZoomed(!zoomed)} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold active:bg-white/20">
              <ZoomInIcon size={20} />
              {zoomed ? t.publicReport.zoomOut : t.publicReport.zoomIn}
            </button>
            {photos.length > 1 ? (
              <button type="button" onClick={() => step(1)} aria-label={t.publicReport.next} className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-white/10 active:bg-white/20">
                <ChevronRightIcon size={24} />
              </button>
            ) : (
              <span className="flex-1" />
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

/** Thumbnail grid (small copies, lazy loaded) that opens the full photo in the viewer. */
export function PhotoGallery({ photos }: { photos: ReportPhoto[] }) {
  const viewer = usePhotoViewer(photos);
  return (
    <>
      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.key}>
            <button type="button" onClick={() => viewer.open(i)} className="block w-full overflow-hidden rounded-lg bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-700">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs; the small copy is already sized for this grid */}
              <img src={p.thumbUrl} alt={p.label} width={640} height={480} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
            </button>
            <p className="mt-0.5 truncate text-xs text-slate-700">{p.label}</p>
          </li>
        ))}
      </ul>
      <PhotoViewer photos={photos} viewer={viewer} />
    </>
  );
}

/**
 * The first thing a buyer sees: a swipeable strip of the car's photos with a counter. The first
 * image loads eagerly (it's the largest thing on screen); the rest lazily.
 */
export function PhotoHero({ photos }: { photos: ReportPhoto[] }) {
  const t = useT();
  const viewer = usePhotoViewer(photos);
  const [current, setCurrent] = useState(0);
  const strip = useRef<HTMLUListElement>(null);

  return (
    <div className="relative -mx-4 sm:mx-0">
      <ul
        ref={strip}
        onScroll={(e) => {
          const el = e.currentTarget;
          setCurrent(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] sm:rounded-2xl [&::-webkit-scrollbar]:hidden"
        aria-label={t.publicReport.photos}
      >
        {photos.map((p, i) => (
          <li key={p.key} className="w-full shrink-0 snap-center">
            <button type="button" onClick={() => viewer.open(i)} className="block w-full bg-slate-200" aria-label={`${p.label}: ${t.publicReport.tapToEnlarge}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
              <img src={p.thumbUrl} alt={p.label} width={640} height={480} loading={i === 0 ? "eager" : "lazy"} decoding="async" className="aspect-[4/3] w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <p className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-ink/80 px-3 py-1 text-sm font-semibold text-white">
        {photos[current]?.label} · {t.publicReport.photoPosition(current + 1, photos.length)}
      </p>
      <PhotoViewer photos={photos} viewer={viewer} />
    </div>
  );
}
