"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AngleHint } from "@/components/angle-hint";
import { Button, LinkButton, buttonClass } from "@/components/button";
import { PHOTO } from "@/lib/config";
import { compressImage } from "@/lib/images/compress";
import { ANGLES, firstMissingIndex, photoProgress, type Angle, type AngleKey } from "@/lib/photos/angles";
import { isRetryable, uploadAnglePhoto } from "@/lib/photos/upload";
import { t } from "@/lib/strings";
import { createClient } from "@/lib/supabase/client";

type SlotStatus = "saved" | "processing" | "uploading" | "failed";
type Slot = {
  status: SlotStatus;
  /** Signed URL from the server, or a local object URL for a photo taken in this session. */
  url: string | null;
  error?: string;
  /** 1-based retry number while a slow upload is being retried. */
  retry?: number;
};
type Slots = Partial<Record<AngleKey, Slot>>;

export type InitialPhoto = { angleKey: AngleKey; url: string | null };

function uploadErrorMessage(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return t.photos.errors.offline;
  return isRetryable(error) ? t.photos.errors.upload : t.photos.errors.rejected;
}

export function PhotoCapture({ carId, carTitle, regNumber, initialPhotos }: { carId: string; carTitle: string; regNumber: string; initialPhotos: InitialPhoto[] }) {
  const [supabase] = useState(() => createClient());
  const [slots, setSlots] = useState<Slots>(() => Object.fromEntries(initialPhotos.map((p) => [p.angleKey, { status: "saved", url: p.url } satisfies Slot])));
  // null shows the overview grid; a number shows the guided screen for that angle.
  const [view, setView] = useState<number | null>(initialPhotos.length === 0 ? 0 : null);
  const [pickError, setPickError] = useState<string | null>(null);

  // Compressed photos waiting for a successful upload, so "Try again" never needs the camera.
  const pending = useRef(new Map<AngleKey, Blob>());
  // Object URLs we created and must revoke.
  const localUrls = useRef(new Set<string>());

  const busy = Object.values(slots).some((s) => s?.status === "processing" || s?.status === "uploading");

  useEffect(() => {
    const urls = localUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = t.photos.leaveWarning;
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  function setSlot(key: AngleKey, next: Partial<Slot> & { status: SlotStatus }) {
    setSlots((prev) => ({ ...prev, [key]: { url: prev[key]?.url ?? null, ...next } }));
  }

  function restoreSlot(key: AngleKey, previous: Slot | undefined) {
    setSlots((prev) => {
      const next = { ...prev };
      if (previous) next[key] = previous;
      else delete next[key];
      return next;
    });
  }

  async function upload(key: AngleKey, blob: Blob) {
    setSlot(key, { status: "uploading" });
    try {
      await uploadAnglePhoto(supabase, carId, key, blob, (attempt) => setSlot(key, { status: "uploading", retry: attempt }));
      pending.current.delete(key);
      setSlot(key, { status: "saved" });
    } catch (error) {
      setSlot(key, { status: "failed", error: uploadErrorMessage(error) });
    }
  }

  async function onPick(angle: Angle, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so choosing the same file (or retaking) fires change again.
    e.target.value = "";
    if (!file) return;

    const key = angle.key;
    const previous = slots[key];
    setPickError(null);
    if (file.type && !file.type.startsWith("image/")) {
      setPickError(t.photos.errors.notImage);
      return;
    }

    setSlot(key, { status: "processing" });
    let blob: Blob;
    try {
      blob = await compressImage(file);
    } catch {
      restoreSlot(key, previous);
      setPickError(t.photos.errors.unreadable);
      return;
    }
    if (blob.size > PHOTO.maxBytes) {
      restoreSlot(key, previous);
      setPickError(t.photos.errors.tooLarge);
      return;
    }

    const url = URL.createObjectURL(blob);
    localUrls.current.add(url);
    if (previous?.url && localUrls.current.delete(previous.url)) URL.revokeObjectURL(previous.url);
    pending.current.set(key, blob);
    setSlot(key, { status: "uploading", url });
    void upload(key, blob);
  }

  function retry(key: AngleKey) {
    const blob = pending.current.get(key);
    if (blob) void upload(key, blob);
  }

  function go(next: number | null) {
    setPickError(null);
    setView(next);
  }

  const savedKeys = ANGLES.filter((a) => slots[a.key]?.status === "saved").map((a) => a.key);
  const progress = photoProgress(savedKeys);

  if (view !== null) {
    const angle = ANGLES[view];
    return (
      <GuideScreen
        key={angle.key}
        angle={angle}
        slot={slots[angle.key]}
        progress={progress}
        pickError={pickError}
        onPick={(e) => onPick(angle, e)}
        onRetry={() => retry(angle.key)}
        onPrevious={() => view > 0 && go(view - 1)}
        onNext={() => (view < ANGLES.length - 1 ? go(view + 1) : go(null))}
        onGrid={() => go(null)}
      />
    );
  }

  // In-flight photos count as covered, so "next" moves on while they upload; failed ones stay on the list.
  const covered = ANGLES.filter((a) => {
    const s = slots[a.key]?.status;
    return s === "saved" || s === "uploading" || s === "processing";
  }).map((a) => a.key);
  const nextIndex = firstMissingIndex(covered);
  const nextAngle = nextIndex >= 0 ? ANGLES[nextIndex] : null;

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/app/cars/${carId}`} className="-ml-1 inline-flex min-h-11 items-center self-start px-1 text-sm font-medium text-brand-700">
        ← {t.photos.backToCar}
      </Link>

      <header>
        <h1 className="text-xl font-bold">{t.photos.title}</h1>
        <p className="text-sm text-slate-600">
          <span className="font-semibold tracking-wider">{regNumber}</span>
          {carTitle && ` · ${carTitle}`}
        </p>
      </header>

      <ProgressCard progress={progress} />

      <ul className="grid grid-cols-3 gap-2">
        {ANGLES.map((angle, i) => (
          <li key={angle.key}>
            <Tile angle={angle} slot={slots[angle.key]} onOpen={() => go(i)} />
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <p className={`text-center text-sm ${progress.allRequiredDone ? "text-brand-800" : "text-slate-600"}`}>
          {!nextAngle ? t.photos.allDone : progress.allRequiredDone ? t.photos.allRequiredDone : t.photos.missingRequired(progress.requiredTotal - progress.requiredDone)}
        </p>
        {progress.allRequiredDone ? (
          <>
            <LinkButton href={`/app/cars/${carId}`}>{t.photos.backToCar}</LinkButton>
            {nextAngle && (
              <Button variant="secondary" onClick={() => go(nextIndex)}>
                {t.photos.continueWith(t.photos.angles[nextAngle.key].label)}
              </Button>
            )}
          </>
        ) : (
          nextAngle && <Button onClick={() => go(nextIndex)}>{t.photos.continueWith(t.photos.angles[nextAngle.key].label)}</Button>
        )}
      </div>
    </div>
  );
}

function ProgressCard({ progress }: { progress: ReturnType<typeof photoProgress> }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label={t.photos.progress(progress.done, progress.total)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xl font-bold">{t.photos.progress(progress.done, progress.total)}</p>
        <p className={`text-sm font-medium ${progress.allRequiredDone ? "text-brand-700" : "text-slate-600"}`}>
          {t.photos.requiredProgress(progress.requiredDone, progress.requiredTotal)}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
        <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
      </div>
    </section>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

function Tile({ angle, slot, onOpen }: { angle: Angle; slot: Slot | undefined; onOpen: () => void }) {
  const { label } = t.photos.angles[angle.key];
  const status = slot?.status;
  const border =
    status === "failed" ? "border-red-400" : status ? "border-slate-200" : angle.required ? "border-amber-300" : "border-dashed border-slate-300";
  const statusText = status ? t.photos.status[status === "processing" ? "processing" : status] : angle.required ? t.photos.required : t.photos.optional;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${angle.number}. ${label}. ${statusText}`}
      className={`block w-full overflow-hidden rounded-xl border bg-white text-left active:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${border}`}
    >
      <div className="relative aspect-square bg-slate-100">
        {slot?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- private signed URL or local blob, not optimisable
          <img src={slot.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <AngleHint angle={angle} className="size-full p-2 text-slate-300" />
        )}
        <span className="absolute top-1 left-1 flex size-6 items-center justify-center rounded-full bg-slate-900/70 text-xs font-semibold text-white">{angle.number}</span>
        <TileBadge status={status} />
      </div>
      <p className="line-clamp-2 min-h-10 px-1.5 py-1.5 text-xs leading-tight font-medium text-slate-700">{label}</p>
    </button>
  );
}

function TileBadge({ status }: { status: SlotStatus | undefined }) {
  if (!status) return null;
  const base = "absolute top-1 right-1 flex size-6 items-center justify-center rounded-full text-white";
  if (status === "saved") {
    return (
      <span className={`${base} bg-brand-700`}>
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 10.5 8 14.5 16 6" />
        </svg>
      </span>
    );
  }
  if (status === "failed") return <span className={`${base} bg-red-600 text-sm font-bold`}>!</span>;
  return (
    <span className={`${base} bg-slate-900/70`}>
      <Spinner className="size-3.5" />
    </span>
  );
}

type GuideProps = {
  angle: Angle;
  slot: Slot | undefined;
  progress: ReturnType<typeof photoProgress>;
  pickError: string | null;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onRetry: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onGrid: () => void;
};

function GuideScreen({ angle, slot, progress, pickError, onPick, onRetry, onPrevious, onNext, onGrid }: GuideProps) {
  const { label, tip } = t.photos.angles[angle.key];
  const working = slot?.status === "processing" || slot?.status === "uploading";
  const hasPhoto = Boolean(slot?.url);
  const isLast = angle.number === ANGLES.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onGrid} className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm font-medium text-brand-700">
          ← {t.photos.grid} ({progress.done}/{progress.total})
        </button>
        <p className="text-sm text-slate-600">{t.photos.stepOf(angle.number, ANGLES.length)}</p>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{label}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${angle.required ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
            {angle.required ? t.photos.required : t.photos.optional}
          </span>
        </div>
        <p className="mt-1 text-slate-600">{tip}</p>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {slot?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- private signed URL or local blob, not optimisable
          <img src={slot.url} alt={label} decoding="async" className="size-full object-contain bg-slate-900" />
        ) : (
          <>
            <AngleHint angle={angle} className="size-full p-6 text-slate-400" />
            <p className="absolute inset-x-0 bottom-2 text-center text-xs text-slate-500">{t.photos.noPhotoYet}</p>
          </>
        )}
      </div>

      <div aria-live="polite" className="min-h-6 text-sm">
        <SlotStatusLine slot={slot} />
        {pickError && <p className="text-red-600">{pickError}</p>}
      </div>
      {slot?.status === "failed" && (
        <Button variant="secondary" onClick={onRetry}>
          {t.photos.tryAgain}
        </Button>
      )}

      <div className="flex flex-col gap-2">
        <PickButton variant={hasPhoto ? "secondary" : "primary"} capture disabled={working} onPick={onPick}>
          {hasPhoto ? t.photos.retake : t.photos.takePhoto}
        </PickButton>
        <PickButton variant="secondary" disabled={working} onPick={onPick}>
          {t.photos.chooseFromGallery}
        </PickButton>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onPrevious} disabled={angle.number === 1}>
          {t.photos.previous}
        </Button>
        <Button variant={hasPhoto ? "primary" : "ghost"} onClick={onNext}>
          {isLast ? t.photos.grid : hasPhoto ? t.photos.next : t.photos.skip}
        </Button>
      </div>
    </div>
  );
}

function SlotStatusLine({ slot }: { slot: Slot | undefined }) {
  if (!slot) return null;
  switch (slot.status) {
    case "processing":
      return <StatusRow icon={<Spinner />}>{t.photos.status.processing}</StatusRow>;
    case "uploading":
      return <StatusRow icon={<Spinner />}>{slot.retry ? t.photos.status.retrying(slot.retry, PHOTO.uploadRetries) : t.photos.status.uploading}</StatusRow>;
    case "saved":
      return <StatusRow className="text-brand-700">✓ {t.photos.status.saved}</StatusRow>;
    case "failed":
      return (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
          {slot.error ?? t.photos.errors.upload}
        </p>
      );
  }
}

function StatusRow({ icon, className = "text-slate-600", children }: { icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <p className={`flex items-center gap-2 font-medium ${className}`}>
      {icon}
      {children}
    </p>
  );
}

function PickButton({
  variant,
  capture,
  disabled,
  onPick,
  children,
}: {
  variant: "primary" | "secondary";
  capture?: boolean;
  disabled: boolean;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  children: ReactNode;
}) {
  // A label around a visually hidden input opens the camera/gallery on every mobile browser.
  return (
    <label
      aria-disabled={disabled}
      className={buttonClass(variant, `w-full cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-700 ${disabled ? "pointer-events-none opacity-60" : ""}`)}
    >
      <input type="file" accept="image/*" capture={capture ? "environment" : undefined} disabled={disabled} onChange={onPick} className="sr-only" />
      {children}
    </label>
  );
}
