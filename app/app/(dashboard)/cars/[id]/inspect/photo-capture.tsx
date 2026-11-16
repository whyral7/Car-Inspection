"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AngleHint } from "@/components/angle-hint";
import { useT } from "@/components/i18n-provider";
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon, CameraIcon, CheckIcon, ChevronLeftIcon, CloudUploadIcon, CrossCircleIcon, ImageIcon, Spinner } from "@/components/icons";
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
  // The auto-advance timer reads the latest slots, not the ones from when the photo was taken.
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);
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
      // On to the next angle still missing a photo, skipping ones already taken (a retake doesn't
      // walk through photos that are fine); when every angle has one, back to the grid.
      const covered = coveredKeys(slotsRef.current);
      covered.add(key);
      const after = ANGLES.findIndex((a, i) => i > index && !covered.has(a.key));
      const before = firstMissingIndex(covered);
      setView(after >= 0 ? after : before >= 0 ? before : null);
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

  // Photos on their way count as covered, so "Next" moves on while they upload and a retake doesn't
  // drop the count; failed ones stay on the list. The waiting note says how many haven't uploaded yet.
  const covered = coveredKeys(slots);
  const progress = photoProgress(covered);
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

  const nextIndex = firstMissingIndex(covered);
  const nextAngle = nextIndex >= 0 ? ANGLES[nextIndex] : null;
  const requiredCovered = progress.requiredDone;
  const requiredDone = progress.allRequiredDone;

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
            <span className="type-code-strong tracking-[var(--tracking-wide)] text-text">{regNumber}</span>
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
            <p className="text-center type-body-sm text-text-muted">{t.photos.missingRequired(progress.requiredTotal - requiredCovered)}</p>
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
        <p className="type-heading-2 tabular">{label}</p>
        {/* A count, not a rating: it stays neutral. */}
        <Badge className="tabular">{t.photos.requiredProgress(progress.requiredDone, progress.requiredTotal)}</Badge>
      </div>
      <ProgressBar value={progress.done} max={progress.total} label={label} />
    </Card>
  );
}

function WaitingNote({ count }: { count: number }) {
  const t = useT();
  return (
    <p role="status" className="flex animate-rise-in items-start gap-2 rounded-md bg-accent-tint px-4 py-3 type-body-sm text-text">
      <CloudUploadIcon size={18} className="mt-px" />
      {t.photos.waitingCount(count)}
    </p>
  );
}

/**
 * Brand PhotoSlot (brand/reference/components/PhotoSlot.md): a 4:3 tile labelled with its angle, in one
 * of four states. Empty: dashed edge, camera glyph and the angle's name (the drawing is on the guide
 * screen, where it is large enough to read). Uploading: solid accent edge.
 * Done: the photo under a scrim with a pass tick. Retake: a 2px fail edge with the reason.
 */
function Tile({ angle, slot, onOpen }: { angle: Angle; slot: Slot | undefined; onOpen: () => void }) {
  const t = useT();
  const [thumbBroken, setThumbBroken] = useState(false);
  const { label } = t.photos.angles[angle.key];
  const status = slot?.status;
  const retake = status === "failed" || status === "review";
  const busy = status === "uploading" || status === "processing" || status === "waiting";
  const statusText = status ? t.photos.status[status] : angle.required ? t.photos.required : t.photos.optional;
  const src = (!thumbBroken && slot?.thumbUrl) || slot?.url;
  const look = retake
    ? "border-2 border-photo-retake-fg bg-photo-retake-bg text-photo-retake-fg"
    : src
      ? "bg-photo-fallback text-on-photo"
      : busy
        ? "border-[length:var(--photo-border-width)] border-photo-busy bg-photo-bg text-photo-busy"
        : "border-[length:var(--photo-border-width)] border-dashed border-photo-border bg-photo-bg text-photo-fg";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${angle.number}. ${label}. ${statusText}`}
      className={`relative flex aspect-[4/3] w-full flex-col justify-end overflow-hidden rounded-md p-[var(--photo-padding)] text-left transition-[scale] [font:var(--photo-font)] active:scale-[var(--scale-press)] ${look}`}
    >
      {src && !retake ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL or local blob, not optimisable */}
          <img src={src} alt="" loading="lazy" decoding="async" onError={() => setThumbBroken(true)} className="absolute inset-0 size-full object-cover" />
          <span aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-photo-scrim-top from-40% to-photo-scrim-bottom" />
        </>
      ) : null}
      <span aria-hidden="true" className="absolute top-[var(--photo-padding)] left-[var(--photo-padding)]">
        {retake ? <AlertIcon size={20} /> : !src && !busy ? <CameraIcon size={20} /> : null}
      </span>
      <TileBadge status={status} />
      <span className="relative line-clamp-2">
        <span className="font-mono">{angle.number}</span> {retake && slot?.issue ? t.photos.issues[slot.issue] : label}
      </span>
      {!status && angle.required && (
        // Said in words, not just colour: which photos still have to be taken.
        <span className="caps absolute top-[var(--photo-padding)] right-[var(--photo-padding)] type-micro">{t.photos.required}</span>
      )}
    </button>
  );
}

function TileBadge({ status }: { status: SlotStatus | undefined }) {
  const base = "absolute top-[var(--photo-padding)] right-[var(--photo-padding)] flex size-5 items-center justify-center rounded-full";
  if (status === "saved")
    return (
      <span className={`${base} animate-pop bg-photo-ok-bg text-photo-ok-fg`}>
        <CheckIcon size={14} />
      </span>
    );
  if (status === "waiting") return <CloudUploadIcon size={18} className="absolute top-[var(--photo-padding)] right-[var(--photo-padding)]" />;
  if (status === "uploading" || status === "processing") return <Spinner className="absolute top-[var(--photo-padding)] right-[var(--photo-padding)] size-4" />;
  return null;
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
            className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-sm px-2 type-label text-button-ghost-fg transition-colors hover:bg-button-ghost-bg-hover"
          >
            <ArrowLeftIcon size={18} />
            {t.photos.grid} <span className="tabular">({progress.done}/{progress.total})</span>
          </button>
          <p className="type-caption text-text-muted tabular">{t.photos.stepOf(angle.number, ANGLES.length)}</p>
        </div>
        <ProgressBar value={angle.number} max={ANGLES.length} label={t.photos.stepOf(angle.number, ANGLES.length)} size="sm" />
      </div>

      {waiting > 0 && <WaitingNote count={waiting} />}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="type-heading-1">{label}</h1>
          <Badge>{angle.required ? t.photos.required : t.photos.optional}</Badge>
        </div>
        {/* Read at the car, often in sunlight: the larger body style, in full ink. */}
        <p className="type-body-lg text-text">{tip}</p>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface shadow-card">
        {slot?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- private signed URL or local blob, not optimisable
          <img src={slot.url} alt={label} decoding="async" className="size-full animate-fade-in bg-photo-fallback object-contain" />
        ) : (
          <>
            <AngleHint angle={angle} className="size-full p-8 text-text-muted" />
            <p className="absolute inset-x-0 bottom-4 text-center type-caption text-text-muted">{t.photos.noPhotoYet}</p>
          </>
        )}
      </div>

      <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
        <SlotStatusLine slot={slot} onRetry={onRetry} />
        {pickError && (
          <p className="flex items-start gap-2 type-label text-fail">
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
        <StatusRow icon={<CheckIcon size={18} />} className="text-pass">
          {t.photos.status.saved}
        </StatusRow>
      );
    case "waiting":
      return (
        <StatusRow icon={<CloudUploadIcon size={18} />} className="text-text">
          {t.photos.status.waitingLong}
        </StatusRow>
      );
    case "review":
      return (
        <div role="alert" className="animate-rise-in rounded-md bg-attention-tint p-4">
          <p className="flex items-center gap-2 type-title-sm">
            <AlertIcon size={18} className="text-attention" />
            {slot.issue ? t.photos.issues[slot.issue] : t.photos.issues.blurry}
          </p>
          <p className="mt-1 type-body-sm text-text-muted">{t.photos.issueHint}</p>
        </div>
      );
    case "failed":
      return (
        <div role="alert" className="flex animate-rise-in flex-col gap-4 rounded-md bg-fail-tint p-4">
          <p className="flex items-start gap-2 type-title-sm">
            <CrossCircleIcon size={18} className="mt-px text-fail" />
            {slot.error ?? t.photos.errors.upload}
          </p>
          <Button variant="secondary" size="sm" onClick={onRetry} className="self-start">
            {t.photos.tryAgain}
          </Button>
        </div>
      );
  }
}

function StatusRow({ icon, className = "text-text-muted", children }: { icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <p className={`flex items-center gap-2 type-label ${className}`}>
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
      ? `inline-flex min-h-11 items-center justify-center gap-2 self-center rounded-sm px-4 type-label transition-colors ${disabled ? "opacity-[var(--button-disabled-opacity)]" : "text-button-ghost-fg hover:bg-button-ghost-bg-hover"}`
      : buttonClass(variant, "w-full", disabled);
  return (
    <label aria-disabled={disabled} className={`${look} cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring ${disabled ? "pointer-events-none" : ""}`}>
      <input type="file" accept="image/*" capture={capture ? "environment" : undefined} disabled={disabled} onChange={onPick} className="sr-only" />
      {children}
    </label>
  );
}

const COVERED_STATUSES = new Set(["saved", "uploading", "processing", "waiting"]);

/** Angles with a photo saved or on its way up. */
function coveredKeys(slots: Slots) {
  return new Set<string>(ANGLES.filter((a) => COVERED_STATUSES.has(slots[a.key]?.status ?? "")).map((a) => a.key));
}
