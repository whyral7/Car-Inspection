"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AngleHint } from "@/components/angle-hint";
import { useT } from "@/components/i18n-provider";
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon, CameraIcon, CheckIcon, ChevronLeftIcon, CloudUploadIcon, ImageIcon, Spinner } from "@/components/icons";
import { RememberStep } from "@/components/remember-step";
import { Badge, Button, Card, LinkButton, ProgressBar, StepHeader, StickyBar, buttonClass, useToast } from "@/components/ui";
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
  const toast = useToast();

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
      setView(index < ANGLES.length - 1 ? index + 1 : null);
      // "Front saved · Retake", in case the auto-advance was too quick.
      toast.show({ tone: "success", message: t.photos.justSaved(t.photos.angles[key].label), action: { label: t.photos.retake, onClick: () => go(index) } });
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
    toast.dismiss();
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
    return (
      <GuideScreen
        key={angle.key}
        angle={angle}
        slot={slots[angle.key]}
        progress={progress}
        waiting={waiting}
        pickError={pickError}
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

  const stepLabels = [t.car.stepPhotos, t.car.stepFindings, t.car.stepChecklist, t.car.stepReport];
  return (
    <div className="flex flex-1 flex-col gap-6">
      <RememberStep carId={carId} step="photos" />
      <StepHeader
        step={1}
        labels={stepLabels}
        stepLabel={t.common.stepOf(1, 4)}
        back={{ href: `/app/cars/${carId}`, label: t.photos.backToCar }}
        title={t.photos.title}
        meta={
          <>
            <span className="font-semibold tracking-wider text-ink tabular">{regNumber}</span>
            {carTitle && ` · ${carTitle}`}
          </>
        }
      />

      <ProgressCard progress={progress} />
      {waiting > 0 && <WaitingNote count={waiting} />}

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4">
        {ANGLES.map((angle, i) => (
          <li key={angle.key}>
            <Tile angle={angle} slot={slots[angle.key]} onOpen={() => go(i)} />
          </li>
        ))}
      </ul>

      <StickyBar>
        {requiredDone ? (
          <>
            <LinkButton href={`/app/cars/${carId}/findings`}>
              {t.car.reviewFindings}
              <ArrowRightIcon size={20} />
            </LinkButton>
            {nextAngle && (
              <Button variant="ghost" size="sm" onClick={() => go(nextIndex)}>
                {t.photos.optionalNext(t.photos.angles[nextAngle.key].label)}
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-center text-small text-ink-muted">{t.photos.missingRequired(progress.requiredTotal - requiredCovered)}</p>
            {nextAngle && (
              <Button onClick={() => go(nextIndex)} icon={<CameraIcon />}>
                {t.photos.continueWith(t.photos.angles[nextAngle.key].label)}
              </Button>
            )}
          </>
        )}
      </StickyBar>
    </div>
  );
}

function ProgressCard({ progress }: { progress: ReturnType<typeof photoProgress> }) {
  const t = useT();
  const label = t.photos.progress(progress.done, progress.total);
  return (
    <Card className="flex flex-col gap-4" aria-label={label}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="text-title tabular">{label}</p>
        <Badge tone={progress.allRequiredDone ? "success" : "warning"} dot className="tabular">
          {t.photos.requiredProgress(progress.requiredDone, progress.requiredTotal)}
        </Badge>
      </div>
      <ProgressBar value={progress.done} max={progress.total} label={label} />
    </Card>
  );
}

function WaitingNote({ count }: { count: number }) {
  const t = useT();
  return (
    <p role="status" className="flex animate-rise-in items-start gap-2 rounded-control bg-brand-50 px-4 py-3 text-small text-brand-900">
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
  // Ring colour says what needs doing: red for a problem, amber for a required photo still to take.
  const ring =
    status === "failed" || status === "review"
      ? "ring-2 ring-danger-600"
      : status
        ? "ring-1 ring-line"
        : angle.required
          ? "ring-2 ring-warning-500/70"
          : "ring-1 ring-line";
  const statusText = status ? t.photos.status[status] : angle.required ? t.photos.required : t.photos.optional;
  const src = (!thumbBroken && slot?.thumbUrl) || slot?.url;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${angle.number}. ${label}. ${statusText}`}
      className={`block w-full overflow-hidden rounded-card bg-surface text-left shadow-card transition-transform duration-150 ring-inset active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${ring}`}
    >
      <div className="relative aspect-square bg-canvas">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- private signed URL or local blob, not optimisable
          <img src={src} alt="" loading="lazy" decoding="async" onError={() => setThumbBroken(true)} className="size-full object-cover" />
        ) : (
          <AngleHint angle={angle} className="size-full p-2 text-ink-subtle" />
        )}
        <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-ink/70 text-caption font-semibold text-white tabular">{angle.number}</span>
        <TileBadge status={status} />
      </div>
      <p className="line-clamp-2 min-h-12 px-2 py-2 text-caption font-medium text-ink">{label}</p>
    </button>
  );
}

function TileBadge({ status }: { status: SlotStatus | undefined }) {
  if (!status) return null;
  const base = "absolute top-2 right-2 flex size-6 animate-pop items-center justify-center rounded-full text-white shadow-card";
  if (status === "saved")
    return (
      <span className={`${base} bg-success-600`}>
        <CheckIcon size={14} strokeWidth={3} />
      </span>
    );
  if (status === "failed" || status === "review")
    return (
      <span className={`${base} bg-danger-700`}>
        <AlertIcon size={14} />
      </span>
    );
  if (status === "waiting")
    return (
      <span className={`${base} bg-ink-muted`}>
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
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeep: () => void;
  onRetry: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onGrid: () => void;
};

function GuideScreen({ angle, slot, progress, waiting, pickError, onPick, onKeep, onRetry, onPrevious, onNext, onGrid }: GuideProps) {
  const t = useT();
  const { label, tip } = t.photos.angles[angle.key];
  const working = slot?.status === "processing";
  const reviewing = slot?.status === "review";
  const hasPhoto = Boolean(slot?.url);
  const isLast = angle.number === ANGLES.length;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <button
            type="button"
            onClick={onGrid}
            className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-chip px-2 text-small font-semibold text-brand-700 transition-colors hover:bg-brand-50"
          >
            <ArrowLeftIcon size={18} />
            {t.photos.grid} <span className="tabular">({progress.done}/{progress.total})</span>
          </button>
          <p className="text-small text-ink-muted tabular">{t.photos.stepOf(angle.number, ANGLES.length)}</p>
        </div>
        <ProgressBar value={angle.number} max={ANGLES.length} label={t.photos.stepOf(angle.number, ANGLES.length)} size="sm" />
      </div>

      {waiting > 0 && <WaitingNote count={waiting} />}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-title">{label}</h1>
          <Badge tone={angle.required ? "warning" : "neutral"}>{angle.required ? t.photos.required : t.photos.optional}</Badge>
        </div>
        <p className="text-ink-muted">{tip}</p>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-surface shadow-card">
        {slot?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- private signed URL or local blob, not optimisable
          <img src={slot.url} alt={label} decoding="async" className="size-full animate-fade-in bg-ink object-contain" />
        ) : (
          <>
            <AngleHint angle={angle} className="size-full p-8 text-ink-subtle" />
            <p className="absolute inset-x-0 bottom-4 text-center text-caption text-ink-subtle">{t.photos.noPhotoYet}</p>
          </>
        )}
      </div>

      <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
        <SlotStatusLine slot={slot} onRetry={onRetry} />
        {pickError && (
          <p className="flex items-start gap-2 text-small font-medium text-danger-700">
            <AlertIcon size={18} className="mt-px" />
            {pickError}
          </p>
        )}
      </div>

      {!reviewing && (
        <PickButton variant="link" disabled={working} onPick={onPick}>
          <ImageIcon size={18} />
          {t.photos.chooseFromGallery}
        </PickButton>
      )}

      <StickyBar>
        {reviewing ? (
          <>
            <PickButton variant="primary" capture disabled={false} onPick={onPick}>
              <CameraIcon />
              {t.photos.retake}
            </PickButton>
            <Button variant="secondary" onClick={onKeep}>
              {t.photos.useAnyway}
            </Button>
          </>
        ) : (
          <>
            <PickButton variant={hasPhoto ? "secondary" : "primary"} capture disabled={working} onPick={onPick}>
              <CameraIcon />
              {hasPhoto ? t.photos.retake : t.photos.takePhoto}
            </PickButton>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" onClick={onPrevious} disabled={angle.number === 1} icon={<ChevronLeftIcon size={18} />}>
                {t.photos.previous}
              </Button>
              <Button variant={hasPhoto ? "primary" : "ghost"} size="sm" onClick={onNext}>
                {isLast ? t.photos.grid : hasPhoto ? t.photos.next : angle.required ? t.photos.skipForNow : t.photos.skip}
                <ArrowRightIcon size={18} />
              </Button>
            </div>
          </>
        )}
      </StickyBar>
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
        <StatusRow icon={<CheckIcon size={18} />} className="text-success-700">
          {t.photos.status.saved}
        </StatusRow>
      );
    case "waiting":
      return (
        <StatusRow icon={<CloudUploadIcon size={18} />} className="text-ink">
          {t.photos.status.waitingLong}
        </StatusRow>
      );
    case "review":
      return (
        <div role="alert" className="animate-rise-in rounded-control bg-warning-50 p-4 text-warning-800">
          <p className="flex items-center gap-2 font-semibold">
            <AlertIcon size={18} />
            {slot.issue ? t.photos.issues[slot.issue] : t.photos.issues.blurry}
          </p>
          <p className="mt-1 text-small">{t.photos.issueHint}</p>
        </div>
      );
    case "failed":
      return (
        <div role="alert" className="flex animate-rise-in flex-col gap-4 rounded-control bg-danger-50 p-4 text-danger-800">
          <p className="font-medium">{slot.error ?? t.photos.errors.upload}</p>
          <Button variant="secondary" size="sm" onClick={onRetry} className="self-start">
            {t.photos.tryAgain}
          </Button>
        </div>
      );
  }
}

function StatusRow({ icon, className = "text-ink-muted", children }: { icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <p className={`flex items-center gap-2 text-small font-medium ${className}`}>
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
      ? `inline-flex min-h-11 items-center justify-center gap-2 self-center rounded-chip px-4 text-small font-semibold transition-colors ${disabled ? "text-ink-subtle" : "text-brand-700 hover:bg-brand-50"}`
      : buttonClass(variant, "w-full", disabled);
  return (
    <label aria-disabled={disabled} className={`${look} cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-700 ${disabled ? "pointer-events-none" : ""}`}>
      <input type="file" accept="image/*" capture={capture ? "environment" : undefined} disabled={disabled} onChange={onPick} className="sr-only" />
      {children}
    </label>
  );
}
