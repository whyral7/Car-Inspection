"use client";

import { useRef, useState, type TouchEvent } from "react";
import { t } from "@/lib/strings";
import type { ReportPhoto } from "@/lib/report/view";

/** Thumbnail grid (small copies, lazy loaded) that opens the full photo in a swipeable viewer. */
export function PhotoGallery({ photos }: { photos: ReportPhoto[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const photo = photos[index];

  function open(i: number) {
    setIndex(i);
    dialog.current?.showModal();
  }

  function step(delta: number) {
    setIndex((i) => (i + delta + photos.length) % photos.length);
  }

  function onTouchEnd(e: TouchEvent) {
    const start = touchX.current;
    touchX.current = null;
    if (start === null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.key}>
            <button type="button" onClick={() => open(i)} className="block w-full overflow-hidden rounded-lg bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-700">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs; the small copy is already sized for this grid */}
              <img src={p.thumbUrl} alt={p.label} width={640} height={480} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
            </button>
            <p className="mt-0.5 truncate text-xs text-slate-600">{p.label}</p>
          </li>
        ))}
      </ul>

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
              <p className="min-w-0 truncate text-sm">
                <span className="font-semibold">{photo.label}</span>
                <span className="text-white/60"> · {t.publicReport.photoPosition(index + 1, photos.length)}</span>
              </p>
              <button type="button" onClick={() => dialog.current?.close()} className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold active:bg-white/10">
                {t.publicReport.close}
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- full-size signed storage URL */}
              <img key={photo.key} src={photo.url} alt={photo.label} className="max-h-full max-w-full object-contain" />
            </div>
            {photos.length > 1 && (
              <div className="flex justify-between gap-3 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <button type="button" onClick={() => step(-1)} aria-label={t.publicReport.previous} className="min-h-12 flex-1 rounded-xl bg-white/10 text-xl active:bg-white/20">
                  ‹
                </button>
                <button type="button" onClick={() => step(1)} aria-label={t.publicReport.next} className="min-h-12 flex-1 rounded-xl bg-white/10 text-xl active:bg-white/20">
                  ›
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
