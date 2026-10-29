"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { AnalyseResponse } from "@/app/api/photos/[photoId]/analyse/route";
import { BackLink, Button, LinkButton, StickyActions } from "@/components/button";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, PencilIcon, PlusIcon, RefreshIcon, SparklesIcon, Spinner, TrashIcon, UndoIcon, ZoomInIcon } from "@/components/icons";
import { Field, FormError, SelectField, TextAreaField } from "@/components/field";
import { Segmented } from "@/components/segmented";
import { runWithConcurrency } from "@/lib/concurrency";
import { AI } from "@/lib/config";
import { FINDING_LIMITS, FINDING_TYPES } from "@/lib/findings";
import type { AngleKey } from "@/lib/photos/angles";
import { useT } from "@/components/i18n-provider";
import type { Strings } from "@/lib/strings";
import type { AiStatus, FindingRow, FindingType, Severity } from "@/lib/supabase/database.types";
import { confirmOdometer, deleteFinding, saveFinding, setFindingsAccepted, type FindingFormInput, type SaveFindingResult } from "./actions";

export type ReviewPhoto = {
  id: string;
  angleKey: AngleKey;
  url: string | null;
  aiStatus: AiStatus;
  odometerKm: number | null;
};

type PhotoState = ReviewPhoto & {
  /** Set while this screen is running (or has just failed to run) the analysis for the photo. */
  run?: "queued" | "running" | "error";
  limitReached?: boolean;
};

type Props = {
  carId: string;
  regNumber: string;
  carTitle: string;
  odometerKm: number | null;
  initialPhotos: ReviewPhoto[];
  initialFindings: FindingRow[];
};

const GENERAL = "general";
/** How long "Note deleted · Undo" stays before the delete is sent. */
const UNDO_MS = 6000;
const typeOptions = (t: Strings) => FINDING_TYPES.map((value) => ({ value, label: t.findings.types[value] }));
const severityOptions = (t: Strings) =>
  [
  { value: "minor", label: t.findings.severities.minor, selectedClass: "border-amber-500 bg-amber-100 text-amber-900" },
  { value: "moderate", label: t.findings.severities.moderate, selectedClass: "border-orange-600 bg-orange-600 text-white" },
  { value: "major", label: t.findings.severities.major, selectedClass: "border-red-600 bg-red-600 text-white" },
] as const satisfies readonly { value: Severity; label: string; selectedClass: string }[];
const severityChip: Record<Severity, string> = {
  minor: "bg-amber-100 text-amber-900",
  moderate: "bg-orange-100 text-orange-900",
  major: "bg-red-100 text-red-800",
};

const kmFormat = new Intl.NumberFormat("en-IN");

export function FindingsReview({ carId, regNumber, carTitle, odometerKm, initialPhotos, initialFindings }: Props) {
  const t = useT();
  const [photos, setPhotos] = useState<PhotoState[]>(initialPhotos);
  const [findings, setFindings] = useState<FindingRow[]>(initialFindings);
  // "<finding id>" while editing one, "new:<photo id | general>" while adding, else null.
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const router = useRouter();
  const started = useRef(false);

  function patchPhoto(id: string, patch: Partial<PhotoState>) {
    setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function analyse(ids: string[]) {
    if (ids.length === 0) return;
    setPhotos((ps) => ps.map((p) => (ids.includes(p.id) ? { ...p, run: "queued", limitReached: false } : p)));
    await runWithConcurrency(ids, AI.concurrency, async (photoId) => {
      patchPhoto(photoId, { run: "running" });
      try {
        const res = await fetch(`/api/photos/${photoId}/analyse`, { method: "POST", signal: AbortSignal.timeout(200_000) });
        if (!res.ok) throw new Error(`Analysis failed with ${res.status}`);
        const data = (await res.json()) as AnalyseResponse;
        // "pending" here means the photo was retaken while we waited; let the dealer run it again.
        const stillToDo = data.status === "pending" || data.status === "failed" || data.limitReached;
        setPhotos((ps) =>
          ps.map((p) =>
            p.id === photoId
              ? { ...p, aiStatus: data.status, odometerKm: data.odometerKm, run: stillToDo ? "error" : undefined, limitReached: data.limitReached }
              : p,
          ),
        );
        setFindings((fs) => [...fs.filter((f) => f.photo_id !== photoId), ...data.findings]);
      } catch {
        patchPhoto(photoId, { run: "error" });
      }
    });
  }

  // Check every photo that hasn't been analysed yet as soon as the screen opens. Failed ones wait
  // for the dealer to tap "Try again", so reopening the screen doesn't keep paying for them.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void analyse(initialPhotos.filter((p) => p.aiStatus === "pending").map((p) => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  async function act(optimistic: (fs: FindingRow[]) => FindingRow[], call: () => Promise<{ ok: boolean; error?: string }>) {
    const before = findings;
    setError(null);
    setFindings(optimistic);
    try {
      const result = await call();
      if (!result.ok) throw new Error(result.error);
    } catch {
      setFindings(before);
      setError(navigator.onLine ? t.findings.errors.save : t.common.offline);
    }
  }

  const setAccepted = (ids: string[], accepted: boolean) =>
    act(
      (fs) => fs.map((f) => (ids.includes(f.id) ? { ...f, accepted } : f)),
      () => setFindingsAccepted(ids, accepted),
    );

  // Deletes wait a few seconds behind an "Undo" bar; leaving the screen sends them at once.
  const [undo, setUndo] = useState<{ finding: FindingRow; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDelete = useRef<string | null>(null);

  const flushDelete = useCallback(async () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    const id = pendingDelete.current;
    pendingDelete.current = null;
    setUndo(null);
    if (!id) return;
    try {
      const result = await deleteFinding(id);
      if (!result.ok) throw new Error(result.error);
    } catch {
      setError(navigator.onLine ? t.findings.errors.save : t.common.offline);
      router.refresh();
    }
  }, [router, t]);

  useEffect(() => {
    const onHide = () => void flushDelete();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flushDelete();
    };
  }, [flushDelete]);

  function remove(id: string) {
    void flushDelete();
    const index = findings.findIndex((f) => f.id === id);
    if (index < 0) return;
    setError(null);
    setUndo({ finding: findings[index], index });
    setFindings((fs) => fs.filter((f) => f.id !== id));
    pendingDelete.current = id;
    undoTimer.current = setTimeout(() => void flushDelete(), UNDO_MS);
  }

  function undoDelete() {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    pendingDelete.current = null;
    setFindings((fs) => [...fs.slice(0, undo.index), undo.finding, ...fs.slice(undo.index)]);
    setUndo(null);
  }

  async function save(input: FindingFormValues, target: { findingId?: string; photoId: string | null }): Promise<SaveFindingResult> {
    let result: SaveFindingResult;
    try {
      result = await saveFinding({ ...input, carId, ...target });
    } catch {
      return { ok: false, error: navigator.onLine ? t.findings.errors.save : t.common.offline };
    }
    if (result.ok) {
      const saved = result.finding;
      setFindings((fs) => (fs.some((f) => f.id === saved.id) ? fs.map((f) => (f.id === saved.id ? saved : f)) : [...fs, saved]));
      setEditing(null);
    }
    return result;
  }

  async function acceptAllAndContinue(ids: string[]) {
    setContinuing(true);
    const before = findings;
    setFindings((fs) => fs.map((f) => (ids.includes(f.id) ? { ...f, accepted: true } : f)));
    try {
      const result = await setFindingsAccepted(ids, true);
      if (!result.ok) throw new Error(result.error);
      await flushDelete();
      router.push(`/app/cars/${carId}/checklist`);
    } catch {
      setFindings(before);
      setError(navigator.onLine ? t.findings.errors.save : t.common.offline);
      setContinuing(false);
    }
  }

  const photoIds = new Set(photos.map((p) => p.id));
  const generalFindings = findings.filter((f) => !f.photo_id || !photoIds.has(f.photo_id));
  const toReview = findings.filter((f) => !f.accepted);
  const active = photos.filter((p) => p.run === "queued" || p.run === "running").length;
  const failed = photos.filter((p) => p.run === "error" || (!p.run && p.aiStatus === "failed"));
  const odometerPhoto = photos.find((p) => p.angleKey === "odometer");

  // Photos that need the user first; quiet ones (no damage, or still being checked) fold away.
  const findingsOf = (photo: PhotoState) => findings.filter((f) => f.photo_id === photo.id);
  const needsAttention = (photo: PhotoState) =>
    findingsOf(photo).some((f) => !f.accepted) || photo.run === "error" || photo.limitReached || (!photo.run && (photo.aiStatus === "failed" || photo.aiStatus === "unclear"));
  const attention = photos.filter(needsAttention);
  const withNotes = photos.filter((p) => !needsAttention(p) && findingsOf(p).length > 0);
  const quiet = photos.filter((p) => !needsAttention(p) && findingsOf(p).length === 0);

  const groupProps = {
    carId,
    editing,
    setEditing,
    onAccept: (id: string, accepted: boolean) => void setAccepted([id], accepted),
    onDelete: remove,
    onSave: save,
  };
  const photoGroup = (photo: PhotoState) => <PhotoGroup key={photo.id} photo={photo} findings={findingsOf(photo)} onRetry={() => void analyse([photo.id])} {...groupProps} />;
  const checklistHref = `/app/cars/${carId}/checklist`;

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/app/cars/${carId}`}>{t.findings.backToCar}</BackLink>

      <header>
        <h1 className="text-xl font-bold">{t.findings.title}</h1>
        <p className="text-sm text-slate-700">
          <span className="font-semibold tracking-wider">{regNumber}</span>
          {carTitle && ` · ${carTitle}`}
        </p>
        <p className="mt-2 text-sm text-slate-700">{t.findings.subtitle}</p>
      </header>

      {photos.length === 0 ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
          <p className="text-slate-800">{t.findings.noPhotos}</p>
          <LinkButton href={`/app/cars/${carId}/inspect`}>{t.findings.takePhotos}</LinkButton>
        </section>
      ) : (
        <AnalysisProgress total={photos.length} active={active} failed={failed.length} onRetry={() => void analyse(failed.map((p) => p.id))} />
      )}

      <OdometerCard carId={carId} initialKm={odometerKm} photo={odometerPhoto} />

      <div aria-live="polite">{error && <FormError message={error} />}</div>

      {attention.length > 0 && (
        <section aria-labelledby="needs-review" className="flex flex-col gap-3">
          <h2 id="needs-review" className="text-lg font-bold">
            {t.findings.sections.attention(attention.length)}
          </h2>
          {attention.map(photoGroup)}
        </section>
      )}

      {withNotes.length > 0 && (
        <section aria-labelledby="accepted-notes" className="flex flex-col gap-3">
          <h2 id="accepted-notes" className="text-lg font-bold">
            {t.findings.sections.accepted}
          </h2>
          {withNotes.map(photoGroup)}
        </section>
      )}

      {quiet.length > 0 && (
        <details className="group rounded-2xl border border-line bg-white">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block font-semibold">{t.findings.sections.quiet(quiet.length)}</span>
              <span className="block text-sm text-slate-700">{t.findings.sections.quietHint}</span>
            </span>
            <ChevronDownIcon size={20} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-3 border-t border-line p-3">{quiet.map(photoGroup)}</div>
        </details>
      )}

      <Group groupKey={GENERAL} title={t.findings.general} subtitle={t.findings.generalHint} photoId={null} findings={generalFindings} {...groupProps} />

      <StickyActions>
        {undo && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-ink px-3 py-1 text-sm text-white">
            <span className="flex-1">{t.findings.deleted}</span>
            <button type="button" onClick={undoDelete} className="inline-flex min-h-11 items-center gap-1.5 px-2 font-semibold">
              <UndoIcon size={16} />
              {t.findings.undo}
            </button>
          </p>
        )}
        {active > 0 ? (
          <>
            <p className="flex items-center justify-center gap-2 text-sm text-slate-800">
              <Spinner className="text-brand-700" />
              {t.findings.analysing(photos.length - active, photos.length)}
            </p>
            <LinkButton href={checklistHref} variant="secondary">
              {t.findings.continueWithoutWaiting}
            </LinkButton>
          </>
        ) : toReview.length > 0 ? (
          <>
            <Button onClick={() => void acceptAllAndContinue(toReview.map((f) => f.id))} loading={continuing}>
              {t.findings.acceptAllContinue(toReview.length)}
            </Button>
            <Link href={checklistHref} className="-mb-1 inline-flex min-h-10 items-center justify-center text-sm font-semibold text-brand-700">
              {t.findings.continueWithout}
            </Link>
          </>
        ) : (
          <>
            <p className={`text-center text-sm ${failed.length ? "font-medium text-red-800" : "text-brand-800"}`}>
              {failed.length ? t.findings.someFailed(failed.length) : t.findings.allReviewed}
            </p>
            <LinkButton href={checklistHref}>
              {t.findings.continue}
              <ChevronRightIcon />
            </LinkButton>
          </>
        )}
      </StickyActions>
    </div>
  );
}

function AnalysisProgress({ total, active, failed, onRetry }: { total: number; active: number; failed: number; onRetry: () => void }) {
  const t = useT();
  const done = total - active;
  const label = t.findings.analysing(done, total);
  return (
    <section aria-live="polite" className="rounded-2xl border border-line bg-white p-4">
      {active > 0 ? (
        <>
          <p className="flex items-center gap-2 font-semibold">
            <Spinner className="text-brand-700" />
            {label}
          </p>
          <p className="mt-1 text-sm text-slate-700">{t.findings.analysingHint}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
            <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </>
      ) : failed > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-red-800">{t.findings.someFailed(failed)}</p>
          <Button variant="secondary" onClick={onRetry} className="min-h-11 shrink-0 px-4 text-sm">
            <RefreshIcon size={18} />
            {t.findings.retryFailed}
          </Button>
        </div>
      ) : (
        <p className="flex items-center gap-2 font-semibold text-brand-800">
          <CheckIcon size={18} />
          {t.findings.analysisDone}
        </p>
      )}
    </section>
  );
}

function OdometerCard({ carId, initialKm, photo }: { carId: string; initialKm: number | null; photo: PhotoState | undefined }) {
  const t = useT();
  const [confirmed, setConfirmed] = useState<number | null>(initialKm);
  const [changing, setChanging] = useState(false);
  // null until the dealer types, so a reading that arrives from the AI later still fills the box.
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const checking = photo && (photo.aiStatus === "pending" || photo.run === "queued" || photo.run === "running");
  const detected = photo?.odometerKm ?? null;
  const value = typed ?? (changing && confirmed !== null ? String(confirmed) : detected !== null ? String(detected) : "");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await confirmOdometer(carId, value);
      if (result.ok) {
        setConfirmed(result.km);
        setChanging(false);
        setTyped(null);
      } else setError(result.error);
    } catch {
      setError(navigator.onLine ? t.findings.errors.save : t.common.offline);
    } finally {
      setSaving(false);
    }
  }

  if (confirmed !== null && !changing) {
    return (
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="min-w-0">
          <h2 className="text-sm text-slate-600">{t.findings.odometer.title}</h2>
          <p className="flex items-center gap-1.5 font-semibold"><CheckIcon size={18} className="text-brand-700" />{t.findings.odometer.confirmed(kmFormat.format(confirmed))}</p>
        </div>
        <Button variant="secondary" onClick={() => setChanging(true)} className="min-h-11 shrink-0 px-4 text-sm">
          {t.findings.odometer.change}
        </Button>
      </section>
    );
  }

  const message = !photo
    ? t.findings.odometer.noPhoto
    : checking
      ? t.findings.odometer.waiting
      : detected !== null
        ? t.findings.odometer.detected(kmFormat.format(detected))
        : t.findings.odometer.notDetected;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4" noValidate>
      <div>
        <h2 className="font-semibold">{t.findings.odometer.title}</h2>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-700">
          {checking && <Spinner className="text-brand-700" />}
          {message}
        </p>
      </div>
      <div className="flex items-end gap-2">
        <Field
          label={t.findings.odometer.label}
          name="odometer_km"
          value={value}
          onChange={(e) => {
            setTyped(e.target.value.replace(/[^\d,\s]/g, ""));
            setError(null);
          }}
          placeholder={t.findings.odometer.placeholder}
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={11}
          error={error ?? undefined}
          className="min-w-0 flex-1"
        />
        <Button type="submit" loading={saving} disabled={!value.trim()} className={`shrink-0 px-4 ${error ? "mb-7" : ""}`}>
          {t.findings.odometer.confirm}
        </Button>
      </div>
    </form>
  );
}

type GroupActions = {
  carId: string;
  editing: string | null;
  setEditing: (key: string | null) => void;
  onAccept: (id: string, accepted: boolean) => void;
  onDelete: (id: string) => void;
  onSave: (input: FindingFormValues, target: { findingId?: string; photoId: string | null }) => Promise<SaveFindingResult>;
};

function PhotoGroup({ photo, findings, onRetry, ...actions }: { photo: PhotoState; findings: FindingRow[]; onRetry: () => void } & GroupActions) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const { label } = t.photos.angles[photo.angleKey];

  return (
    <Group
      groupKey={photo.id}
      title={label}
      photoId={photo.id}
      findings={findings}
      media={
        photo.url && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={`${label}: ${expanded ? t.findings.shrinkPhoto : t.findings.enlargePhoto}`}
            className={`relative block shrink-0 overflow-hidden rounded-xl bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${expanded ? "w-full" : "size-24"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL, not optimisable */}
            <img src={photo.url} alt="" loading="lazy" decoding="async" className={`size-full ${expanded ? "object-contain" : "object-cover"}`} />
            {!expanded && (
              <span className="absolute right-1 bottom-1 flex size-7 items-center justify-center rounded-full bg-ink/75 text-white">
                <ZoomInIcon size={16} />
              </span>
            )}
          </button>
        )
      }
      status={<PhotoStatus photo={photo} findingCount={findings.length} carId={actions.carId} onRetry={onRetry} />}
      {...actions}
    />
  );
}

function PhotoStatus({ photo, findingCount, carId, onRetry }: { photo: PhotoState; findingCount: number; carId: string; onRetry: () => void }) {
  const t = useT();
  const s = t.findings.photoStatus;
  if (photo.run === "queued" || (!photo.run && photo.aiStatus === "pending")) return <p className="text-sm text-slate-700">{s.queued}</p>;
  if (photo.run === "running")
    return (
      <p className="flex items-center gap-2 text-sm text-slate-700">
        <Spinner className="text-brand-700" />
        {s.pending}
      </p>
    );
  const retake = (
    <Link href={`/app/cars/${carId}/inspect?angle=${photo.angleKey}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700">
      <RefreshIcon size={16} />
      {t.findings.retakePhoto}
    </Link>
  );
  if (photo.limitReached)
    return (
      <div>
        <p className="text-sm font-medium text-red-800">{s.limit}</p>
        {retake}
      </div>
    );
  if (photo.run === "error" || photo.aiStatus === "failed")
    return (
      <div>
        <p className="text-sm font-medium text-red-800">{s.failed}</p>
        <div className="flex flex-wrap gap-x-4">
          <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700">
            <RefreshIcon size={16} />
            {t.findings.tryAgain}
          </button>
          {retake}
        </div>
      </div>
    );
  if (photo.aiStatus === "unclear")
    return (
      <div>
        <p className="text-sm font-medium text-amber-900">{s.unclear}</p>
        {retake}
      </div>
    );
  return <p className="text-sm text-slate-700">{findingCount === 0 ? s.noDamage : s.done}</p>;
}

function Group({
  groupKey,
  title,
  subtitle,
  photoId,
  findings,
  media,
  status,
  editing,
  setEditing,
  onAccept,
  onDelete,
  onSave,
}: {
  groupKey: string;
  title: string;
  subtitle?: string;
  photoId: string | null;
  findings: FindingRow[];
  media?: ReactNode;
  status?: ReactNode;
} & GroupActions) {
  const t = useT();
  const adding = editing === `new:${groupKey}`;
  return (
    <section className="rounded-2xl border border-line bg-white p-4" aria-label={title}>
      <div className="flex flex-wrap items-start gap-3">
        {media}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-slate-700">{subtitle}</p>}
          {status}
        </div>
      </div>

      {findings.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {findings.map((f) => (
            <li key={f.id}>
              {editing === f.id ? (
                <FindingForm title={t.findings.editTitle} initial={f} onCancel={() => setEditing(null)} onSave={(v) => onSave(v, { findingId: f.id, photoId: f.photo_id })} />
              ) : (
                <FindingCard finding={f} onAccept={(a) => onAccept(f.id, a)} onEdit={() => setEditing(f.id)} onDelete={() => onDelete(f.id)} />
              )}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="mt-3">
          <FindingForm title={t.findings.addTitle} initial={null} onCancel={() => setEditing(null)} onSave={(v) => onSave(v, { photoId })} />
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setEditing(`new:${groupKey}`)} className="mt-2 -ml-2 min-h-11 px-2 text-sm">
          <PlusIcon size={18} />
          {t.findings.add}
        </Button>
      )}
    </section>
  );
}

function FindingCard({ finding, onAccept, onEdit, onDelete }: { finding: FindingRow; onAccept: (accepted: boolean) => void; onEdit: () => void; onDelete: () => void }) {
  const t = useT();
  // Edit and Delete are compact (icon over a short label) so the row fits a 360px screen in any language.
  const compact = "min-h-12 w-16 shrink-0 flex-col !gap-0.5 !px-1 text-xs";

  return (
    <article className={`rounded-xl border p-3 ${finding.accepted ? "border-line bg-white" : "border-amber-400 bg-amber-50"}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold">{t.findings.types[finding.type]}</span>
        <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${severityChip[finding.severity]}`}>{t.findings.severities[finding.severity]}</span>
        {finding.source === "ai" && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 ring-1 ring-slate-300">
            <SparklesIcon size={12} />
            {t.findings.aiSuggestion}
          </span>
        )}
        <span className={`ml-auto inline-flex items-center gap-1 text-xs font-semibold ${finding.accepted ? "text-brand-800" : "text-amber-900"}`}>
          {finding.accepted && <CheckIcon size={14} />}
          {finding.accepted ? t.findings.accepted : t.findings.needsReview}
        </span>
      </div>
      {finding.location && <p className="mt-1 text-sm font-medium text-slate-900">{finding.location}</p>}
      {finding.note && <p className="mt-0.5 text-sm text-slate-700">{finding.note}</p>}

      <div className="mt-2 flex gap-2">
        {finding.accepted ? (
          <Button variant="secondary" onClick={() => onAccept(false)} className="min-h-12 min-w-0 flex-1 px-2 text-sm">
            <UndoIcon size={16} />
            {t.findings.unaccept}
          </Button>
        ) : (
          <Button onClick={() => onAccept(true)} className="min-h-12 min-w-0 flex-1 px-2 text-sm">
            <CheckIcon size={16} />
            {t.findings.accept}
          </Button>
        )}
        <Button variant="secondary" onClick={onEdit} className={compact} aria-label={`${t.findings.edit}: ${t.findings.types[finding.type]}`}>
          <PencilIcon size={16} />
          {t.findings.edit}
        </Button>
        <Button variant="secondary" onClick={onDelete} className={`${compact} !text-red-700`} aria-label={`${t.findings.delete}: ${t.findings.types[finding.type]}`}>
          <TrashIcon size={16} />
          {t.findings.delete}
        </Button>
      </div>
    </article>
  );
}

type FindingFormValues = FindingFormInput;

function FindingForm({
  title,
  initial,
  onSave,
  onCancel,
}: {
  title: string;
  initial: FindingRow | null;
  onSave: (values: FindingFormValues) => Promise<SaveFindingResult>;
  onCancel: () => void;
}) {
  const t = useT();
  const [type, setType] = useState<FindingType | "">(initial?.type ?? "");
  const [severity, setSeverity] = useState<Severity | null>(initial?.severity ?? null);
  const [location, setLocation] = useState(initial?.location ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [errors, setErrors] = useState<Partial<Record<keyof FindingFormValues, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Field ids must be unique while several forms could exist on the page.
  const prefix = initial?.id ?? "new";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const result = await onSave({ type, severity: severity ?? "", location, note });
    setSaving(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error ?? null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3" noValidate>
      <h3 className="font-semibold">{title}</h3>
      <SelectField
        label={t.findings.type}
        name={`${prefix}-type`}
        value={type}
        onChange={(e) => {
          setType(e.target.value as FindingType);
          setErrors((x) => ({ ...x, type: undefined }));
        }}
        options={typeOptions(t)}
        placeholder={t.cars.choose}
        error={errors.type}
      />
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">{t.findings.severity}</p>
        <Segmented
          label={t.findings.severity}
          options={severityOptions(t)}
          value={severity}
          onChange={(v) => {
            setSeverity(v);
            setErrors((x) => ({ ...x, severity: undefined }));
          }}
        />
        {errors.severity && <p className="mt-1.5 text-sm text-red-600">{errors.severity}</p>}
      </div>
      <Field
        label={t.findings.location}
        name={`${prefix}-location`}
        value={location}
        onChange={(e) => {
          setLocation(e.target.value);
          setErrors((x) => ({ ...x, location: undefined }));
        }}
        placeholder={t.findings.locationPlaceholder}
        maxLength={FINDING_LIMITS.locationChars}
        error={errors.location}
      />
      <TextAreaField
        label={t.findings.note}
        name={`${prefix}-note`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t.findings.notePlaceholder}
        maxLength={FINDING_LIMITS.noteChars}
        error={errors.note}
      />
      <FormError message={formError} />
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          {t.findings.cancel}
        </Button>
        <Button type="submit" loading={saving}>
          {saving ? t.findings.saving : t.findings.save}
        </Button>
      </div>
    </form>
  );
}
