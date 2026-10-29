"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AngleHint } from "@/components/angle-hint";
import { BackLink, Button, LinkButton, StickyActions, buttonClass } from "@/components/button";
import { useT } from "@/components/i18n-provider";
import { AlertIcon, ArrowLeftIcon, CameraIcon, CheckIcon, ChevronRightIcon, CloudUploadIcon, ImageIcon, Spinner } from "@/components/icons";
import { PHOTO } from "@/lib/config";
import { compressImage } from "@/lib/images/compress";
import { checkPhoto, type PhotoIssue } from "@/lib/images/quality";
import { photoOutbox } from "@/lib/outbox";
import { ANGLES, firstMissingIndex, photoProgress, type Angle, type AngleKey } from "@/lib/photos/angles";
import { isRetryable, uploadAnglePhoto } from "@/lib/photos/upload";
import type { Strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/client";

// Photo states:
// - processing: being compressed and checked in the browser
// - review:     the quick check thinks it's dark or blurry; the user retakes or keeps it
// - uploading:  saved on the phone (outbox) and on its way up
// - waiting:    saved on the phone, no connection; goes up automatically when back online
// - failed:     the server refused it, or kept failing while online; "Try again"
// - saved:      on the server
type SlotStatus = "saved" | "processing" | "review" | "uploading" | "waiting" | "failed";
type Slot = {
  status: SlotStatus;
  /** Full photo: signed URL from the server, or a local object URL for a photo taken on this phone. */
  url: string | null;
  /** Small copy for tiles, when the server has one. */
  thumbUrl?: string | null;
  error?: string;
  issue?: PhotoIssue;
  /** 1-based retry number while a slow upload is being retried. */
  retry?: number;
  /** Also saved in the phone's outbox, so it survives a reload. */
  stored?: boolean;
};
type Slots = Partial<Record<AngleKey, Slot>>;

export type InitialPhoto = { angleKey: AngleKey; url: string | null; thumbUrl: string | null };

/** How long the "saved" tick shows before moving on to the next angle. */
const ADVANCE_MS = 700;

function uploadError(t: Strings, error: unknown): { status: "waiting" | "failed"; error?: string } {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { status: "waiting" };
  return isRetryable(error) ? { status: "failed", error: t.photos.errors.upload } : { status: "failed", error: t.photos.errors.rejected };
}

type Props = {
  carId: string;
  carTitle: string;
  regNumber: string;
  initialPhotos: InitialPhoto[];
  /** Index of an angle to open first; otherwise a new car opens on photo 1 and a started one on the grid. */
  startAt?: number | null;
};

export function PhotoCapture({ carId, carTitle, regNumber, initialPhotos, startAt = null }: Props) {
  const t = useT();
  const [supabase] = useState(() => createClient());
  const [slots, setSlots] = useState<Slots>(() =>
    Object.fromEntries(initialPhotos.map((p) => [p.angleKey, { status: "saved", url: p.url, thumbUrl: p.thumbUrl } satisfies Slot])),
  );
  // null shows the overview grid; a number shows the guided screen for that angle.
  const [view, setView] = useState<number | null>(startAt ?? (initialPhotos.length === 0 ? 0 : null));
  const viewRef = useRef(view);
  const [pickError, setPickError] = useState<string | null>(null);
  // The angle that was just saved, for the "Front saved · Retake" note on the next screen.
  const [justSaved, setJustSaved] = useState<AngleKey | null>(null);

  // Compressed photos not yet on the server, so "Try again" never needs the camera. `accepted` is
  // false while the user decides about a photo the quick check flagged.
  const pending = useRef(new Map<AngleKey, { blob: Blob; small: Blob | null; accepted: boolean }>());
  // Object URLs we created and must revoke.
  const localUrls = useRef(new Set<string>());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSlot = useCallback((key: AngleKey, next: Partial<Slot> & { status: SlotStatus }) => {
    setSlots((prev) => ({ ...prev, [key]: { url: prev[key]?.url ?? null, thumbUrl: prev[key]?.thumbUrl, ...next } }));
  }, []);

  const upload = useCallback(
    async (key: AngleKey) => {
      const item = pending.current.get(key);
      if (!item?.accepted) return;
      if (!navigator.onLine) {
        setSlot(key, { status: "waiting" });
        return;
      }
      setSlot(key, { status: "uploading" });
      try {
        await uploadAnglePhoto(supabase, carId, key, item.blob, (attempt) => setSlot(key, { status: "uploading", retry: attempt }), item.small);
        pending.current.delete(key);
        await photoOutbox.remove(carId, key);
        setSlot(key, { status: "saved", thumbUrl: null, stored: false });
      } catch (error) {
        setSlot(key, uploadError(t, error));
      }
    },
    [carId, setSlot, supabase, t],
  );

  // Photos left in the outbox by an earlier visit (offline, closed tab): show them and send them.
  useEffect(() => {
    let cancelled = false;
    void photoOutbox.list(carId).then((entries) => {
      if (cancelled) return;
      for (const entry of entries) {
        const url = URL.createObjectURL(entry.blob);
        localUrls.current.add(url);
        pending.current.set(entry.angleKey, { blob: entry.blob, small: entry.small, accepted: true });
        setSlot(entry.angleKey, { status: "waiting", url, thumbUrl: null, stored: true });
        void upload(entry.angleKey);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [carId, setSlot, upload]);

  // Back online: send everything that was waiting.
  useEffect(() => {
    const onOnline = () => {
      for (const key of pending.current.keys()) void upload(key);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [upload]);

  useEffect(() => {
    const urls = localUrls.current;
    const timer = advanceTimer;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Only warn before leaving when a photo would really be lost (not yet in the outbox).
  const unsafe = Object.values(slots).some((s) => s?.status === "processing" || ((s?.status === "uploading" || s?.status === "review") && !s.stored));
  useEffect(() => {
    if (!unsafe) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = t.photos.leaveWarning;
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsafe, t]);

  useEffect(() => {
    viewRef.current = view;
    window.scrollTo({ top: 0 });
  }, [view]);

  function go(next: number | null) {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setPickError(null);
    setJustSaved(null);
    setView(next);
  }

  /** Keeps a checked photo: into the outbox, up to the server, and on to the next angle. */
  async function accept(angle: Angle) {
    const key = angle.key;
    const item = pending.current.get(key);
    if (!item) return;
    item.accepted = true;
    setSlot(key, { status: "uploading", issue: undefined });
    const stored = await photoOutbox.put({ carId, angleKey: key, blob: item.blob, small: item.small });
    setSlots((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], stored } } : prev));
    void upload(key);

    // Move on by itself, unless the user has already gone somewhere else.
    const index = ANGLES.indexOf(angle);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      if (viewRef.current !== index) return;
      setPickError(null);
      setJustSaved(key);
      setView(index < ANGLES.length - 1 ? index + 1 : null);
    }, ADVANCE_MS);
  }

  async function onPick(angle: Angle, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so choosing the same file (or retaking) fires change again.
    e.target.value = "";
    if (!file) return;

    const key = angle.key;
    const previous = slots[key];
    setPickError(null);
    setJustSaved(null);
    if (file.type && !file.type.startsWith("image/")) {
      setPickError(t.photos.errors.notImage);
      return;
    }

    const restore = () =>
      setSlots((prev) => {
        const next = { ...prev };
        if (previous) next[key] = previous;
        else delete next[key];
        return next;
      });

    setSlot(key, { status: "processing" });
    let blob: Blob;
    try {
      blob = await compressImage(file);
    } catch {
      restore();
      setPickError(t.photos.errors.unreadable);
      return;
    }
    if (blob.size > PHOTO.maxBytes) {
      restore();
      setPickError(t.photos.errors.tooLarge);
      return;
    }

    // The report copy. Without it the report just uses the full photo, so a failure here is fine.
    const [small, issue] = await Promise.all([compressImage(blob, { maxEdgePx: PHOTO.smallEdgePx, quality: PHOTO.smallJpegQuality }).catch(() => null), checkPhoto(blob)]);

    const url = URL.createObjectURL(blob);
    localUrls.current.add(url);
    if (previous?.url && localUrls.current.delete(previous.url)) URL.revokeObjectURL(previous.url);
    pending.current.set(key, { blob, small, accepted: false });

    if (issue) {
      setSlot(key, { status: "review", url, thumbUrl: null, issue });
      return;
    }
    setSlot(key, { status: "uploading", url, thumbUrl: null });
    void accept(angle);
  }

  const savedKeys = ANGLES.filter((a) => slots[a.key]?.status === "saved").map((a) => a.key);
  const progress = photoProgress(savedKeys);
  const waiting = ANGLES.filter((a) => slots[a.key]?.status === "waiting").length;

  if (view !== null) {
    const angle = ANGLES[view];
    const saved = justSaved ? ANGLES.find((a) => a.key === justSaved)! : null;
    return (
      <GuideScreen
        key={angle.key}
        angle={angle}
        slot={slots[angle.key]}
        progress={progress}
        waiting={waiting}
        pickError={pickError}
        justSaved={saved}
        onRetakeSaved={() => saved && go(ANGLES.indexOf(saved))}
        onPick={(e) => onPick(angle, e)}
        onKeep={() => void accept(angle)}
        onRetry={() => void upload(angle.key)}
        onPrevious={() => view > 0 && go(view - 1)}
        onNext={() => (view < ANGLES.length - 1 ? go(view + 1) : go(null))}
        onGrid={() => go(null)}
      />
    );
  }

  // Photos on their way count as covered, so "Next" moves on while they upload; failed ones stay on the list.
  const covered = ANGLES.filter((a) => ["saved", "uploading", "processing", "waiting"].includes(slots[a.key]?.status ?? "")).map((a) => a.key);
  const nextIndex = firstMissingIndex(covered);
  const nextAngle = nextIndex >= 0 ? ANGLES[nextIndex] : null;
  const requiredCovered = ANGLES.filter((a) => a.required && covered.includes(a.key)).length;
  const requiredDone = requiredCovered === progress.requiredTotal;

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/app/cars/${carId}`}>{t.photos.backToCar}</BackLink>

      <header>
        <h1 className="text-xl font-bold">{t.photos.title}</h1>
        <p className="text-sm text-slate-700">
          <span className="font-semibold tracking-wider">{regNumber}</span>
          {carTitle && ` · ${carTitle}`}
        </p>
      </header>

      <ProgressCard progress={progress} />
      {waiting > 0 && <WaitingNote count={waiting} />}

      <ul className="grid grid-cols-3 gap-2">
        {ANGLES.map((angle, i) => (
          <li key={angle.key}>
            <Tile angle={angle} slot={slots[angle.key]} onOpen={() => go(i)} />
          </li>
        ))}
      </ul>

      <StickyActions>
        {requiredDone ? (
          <>
            <LinkButton href={`/app/cars/${carId}/findings`}>
              {t.car.reviewFindings}
              <ChevronRightIcon />
            </LinkButton>
            {nextAngle && (
              <button type="button" onClick={() => go(nextIndex)} className="min-h-11 text-sm font-semibold text-brand-700">
                {t.photos.optionalNext(t.photos.angles[nextAngle.key].label)}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-center text-sm text-slate-700">{t.photos.missingRequired(progress.requiredTotal - requiredCovered)}</p>
            {nextAngle && (
              <Button onClick={() => go(nextIndex)}>
                <CameraIcon />
                {t.photos.continueWith(t.photos.angles[nextAngle.key].label)}
              </Button>
            )}
          </>
        )}
      </StickyActions>
    </div>
  );
}

function ProgressCard({ progress }: { progress: ReturnType<typeof photoProgress> }) {
  const t = useT();
  const label = t.photos.progress(progress.done, progress.total);
  return (
    <section className="rounded-2xl border border-line bg-white p-4" aria-label={label}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-2xl font-bold">{label}</p>
        <p className={`text-sm font-semibold ${progress.allRequiredDone ? "text-brand-800" : "text-slate-700"}`}>
          {t.photos.requiredProgress(progress.requiredDone, progress.requiredTotal)}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
        <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
      </div>
    </section>
  );
}

function WaitingNote({ count }: { count: number }) {
  const t = useT();
  return (
    <p role="status" className="flex items-start gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800">
      <CloudUploadIcon size={18} className="mt-px text-brand-700" />
      {t.photos.waitingCount(count)}
    </p>
  );
}

function Tile({ angle, slot, onOpen }: { angle: Angle; slot: Slot | undefined; onOpen: () => void }) {
  const t = useT();
  const [thumbBroken, setThumbBroken] = useState(false);
  const { label } = t.photos.angles[angle.key];
  const status = slot?.status;
  const border =
    status === "failed" || status === "review"
      ? "border-red-500"
      : status === "waiting"
        ? "border-slate-400"
        : status
          ? "border-line"
          : angle.required
            ? "border-amber-400"
            : "border-dashed border-slate-300";
  const statusText = status ? t.photos.status[status] : angle.required ? t.photos.required : t.photos.optional;
  const src = (!thumbBroken && slot?.thumbUrl) || slot?.url;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${angle.number}. ${label}. ${statusText}`}
      className={`block w-full overflow-hidden rounded-xl border-2 bg-white text-left active:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${border}`}
    >
      <div className="relative aspect-square bg-slate-100">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- private signed URL or local blob, not optimisable
          <img src={src} alt="" loading="lazy" decoding="async" onError={() => setThumbBroken(true)} className="size-full object-cover" />
        ) : (
          <AngleHint angle={angle} className="size-full p-2 text-slate-500" />
        )}
        <span className="absolute top-1 left-1 flex size-6 items-center justify-center rounded-full bg-ink/75 text-xs font-semibold text-white">{angle.number}</span>
        <TileBadge status={status} />
      </div>
      <p className="line-clamp-2 min-h-10 px-1.5 py-1.5 text-xs leading-tight font-medium text-slate-800">{label}</p>
    </button>
  );
}

function TileBadge({ status }: { status: SlotStatus | undefined }) {
  if (!status) return null;
  const base = "absolute top-1 right-1 flex size-6 items-center justify-center rounded-full text-white";
  if (status === "saved")
    return (
      <span className={`${base} bg-brand-700`}>
        <CheckIcon size={14} strokeWidth={3} />
      </span>
    );
  if (status === "failed" || status === "review")
    return (
      <span className={`${base} bg-red-700`}>
        <AlertIcon size={14} />
      </span>
    );
  if (status === "waiting")
    return (
      <span className={`${base} bg-slate-700`}>
        <CloudUploadIcon size={14} />
      </span>
    );
  return (
    <span className={`${base} bg-ink/75`}>
      <Spinner className="size-3.5" />
    </span>
  );
}

type GuideProps = {
  angle: Angle;
  slot: Slot | undefined;
  progress: ReturnType<typeof photoProgress>;
  waiting: number;
  pickError: string | null;
  justSaved: Angle | null;
  onRetakeSaved: () => void;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeep: () => void;
  onRetry: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onGrid: () => void;
};

function GuideScreen({ angle, slot, progress, waiting, pickError, justSaved, onRetakeSaved, onPick, onKeep, onRetry, onPrevious, onNext, onGrid }: GuideProps) {
  const t = useT();
  const { label, tip } = t.photos.angles[angle.key];
  const working = slot?.status === "processing";
  const reviewing = slot?.status === "review";
  const hasPhoto = Boolean(slot?.url);
  const isLast = angle.number === ANGLES.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <button type="button" onClick={onGrid} className="-ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold text-brand-700">
          <ArrowLeftIcon size={18} />
          {t.photos.grid} ({progress.done}/{progress.total})
        </button>
        <p className="text-sm text-slate-700">{t.photos.stepOf(angle.number, ANGLES.length)}</p>
      </div>

      {justSaved && (
        <p role="status" className="flex animate-pop items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-900">
          <CheckIcon size={18} />
          <span className="flex-1">{t.photos.justSaved(t.photos.angles[justSaved.key].label)}</span>
          <button type="button" onClick={onRetakeSaved} className="min-h-9 px-2 font-semibold underline underline-offset-2">
            {t.photos.retake}
          </button>
        </p>
      )}
      {waiting > 0 && !justSaved && <WaitingNote count={waiting} />}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{label}</h1>
          <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${angle.required ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-800"}`}>
            {angle.required ? t.photos.required : t.photos.optional}
          </span>
        </div>
        <p className="mt-1 text-slate-700">{tip}</p>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-white">
        {slot?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- private signed URL or local blob, not optimisable
          <img src={slot.url} alt={label} decoding="async" className="size-full bg-ink object-contain" />
        ) : (
          <>
            <AngleHint angle={angle} className="size-full p-6 text-slate-500" />
            <p className="absolute inset-x-0 bottom-2 text-center text-xs text-slate-600">{t.photos.noPhotoYet}</p>
          </>
        )}
      </div>

      <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
        <SlotStatusLine slot={slot} onRetry={onRetry} />
        {pickError && <p className="font-medium text-red-700">{pickError}</p>}
      </div>

      {reviewing ? (
        <div className="flex flex-col gap-2">
          <PickButton variant="primary" capture disabled={false} onPick={onPick}>
            <CameraIcon />
            {t.photos.retake}
          </PickButton>
          <Button variant="secondary" onClick={onKeep}>
            {t.photos.useAnyway}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <PickButton variant={hasPhoto ? "secondary" : "primary"} capture disabled={working} onPick={onPick}>
            <CameraIcon />
            {hasPhoto ? t.photos.retake : t.photos.takePhoto}
          </PickButton>
          <PickButton variant="link" disabled={working} onPick={onPick}>
            <ImageIcon size={18} />
            {t.photos.chooseFromGallery}
          </PickButton>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onPrevious} disabled={angle.number === 1}>
          {t.photos.previous}
        </Button>
        <Button variant={hasPhoto && !reviewing ? "primary" : "ghost"} onClick={onNext}>
          {isLast ? t.photos.grid : hasPhoto ? t.photos.next : angle.required ? t.photos.skipForNow : t.photos.skip}
        </Button>
      </div>
    </div>
  );
}

function SlotStatusLine({ slot, onRetry }: { slot: Slot | undefined; onRetry: () => void }) {
  const t = useT();
  if (!slot) return null;
  switch (slot.status) {
    case "processing":
      return <StatusRow icon={<Spinner />}>{t.photos.status.processing}</StatusRow>;
    case "uploading":
      return <StatusRow icon={<Spinner />}>{slot.retry ? t.photos.status.retrying(slot.retry, PHOTO.uploadRetries) : t.photos.status.uploading}</StatusRow>;
    case "saved":
      return (
        <StatusRow icon={<CheckIcon size={18} />} className="text-brand-800">
          {t.photos.status.saved}
        </StatusRow>
      );
    case "waiting":
      return (
        <StatusRow icon={<CloudUploadIcon size={18} />} className="text-slate-800">
          {t.photos.status.waitingLong}
        </StatusRow>
      );
    case "review":
      return (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
          <p className="flex items-center gap-2 font-semibold">
            <AlertIcon size={18} />
            {slot.issue ? t.photos.issues[slot.issue] : t.photos.issues.blurry}
          </p>
          <p className="mt-1 text-sm">{t.photos.issueHint}</p>
        </div>
      );
    case "failed":
      return (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
          <p className="font-medium">{slot.error ?? t.photos.errors.upload}</p>
          <Button variant="secondary" onClick={onRetry} className="min-h-11 self-start px-4 text-sm">
            {t.photos.tryAgain}
          </Button>
        </div>
      );
  }
}

function StatusRow({ icon, className = "text-slate-700", children }: { icon?: ReactNode; className?: string; children: ReactNode }) {
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
  variant: "primary" | "secondary" | "link";
  capture?: boolean;
  disabled: boolean;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  children: ReactNode;
}) {
  // A label around a visually hidden input opens the camera/gallery on every mobile browser.
  const look =
    variant === "link"
      ? `inline-flex min-h-11 items-center justify-center gap-2 self-center rounded-xl px-3 text-sm font-semibold ${disabled ? "text-slate-500" : "text-brand-700 active:bg-brand-50"}`
      : buttonClass(variant, "w-full", disabled);
  return (
    <label aria-disabled={disabled} className={`${look} cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-700 ${disabled ? "pointer-events-none" : ""}`}>
      <input type="file" accept="image/*" capture={capture ? "environment" : undefined} disabled={disabled} onChange={onPick} className="sr-only" />
      {children}
    </label>
  );
}
