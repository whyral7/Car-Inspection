"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { AnalyseResponse } from "@/app/api/photos/[photoId]/analyse/route";
import { useT } from "@/components/i18n-provider";
import { ArrowRightIcon, CameraIcon, CheckIcon, ChevronDownIcon, PencilIcon, PlusIcon, RefreshIcon, SparklesIcon, Spinner, TrashIcon, UndoIcon, ZoomInIcon } from "@/components/icons";
import { RememberStep } from "@/components/remember-step";
import { SEVERITY_EDGE, SEVERITY_TONE } from "@/components/severity";
import {
  Badge,
  cardClass,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Field,
  FieldMessage,
  FormError,
  LinkButton,
  ProgressBar,
  Segmented,
  SelectField,
  StepHeader,
  StickyBar,
  TextAreaField,
  TextButton,
  useToast,
} from "@/components/ui";
import { runWithConcurrency } from "@/lib/concurrency";
import { AI } from "@/lib/config";
import { FINDING_LIMITS, FINDING_TYPES } from "@/lib/findings";
import { clearDraft, readDraft, saveDraft } from "@/lib/draft";
import type { AngleKey } from "@/lib/photos/angles";
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
    { value: "minor", label: t.findings.severities.minor, selectedClass: "bg-ink-muted text-white ring-ink-muted" },
    { value: "moderate", label: t.findings.severities.moderate, selectedClass: "bg-warning-700 text-white ring-warning-700" },
    { value: "major", label: t.findings.severities.major, selectedClass: "bg-danger-700 text-white ring-danger-700" },
  ] as const satisfies readonly { value: Severity; label: string; selectedClass: string }[];

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
  const toast = useToast();
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

  // Deletes wait behind a "Note deleted · Undo" toast; when it goes (or the screen is left) they're sent.
  const undo = useRef<{ finding: FindingRow; index: number } | null>(null);
  const pendingDelete = useRef<string | null>(null);

  const flushDelete = useCallback(async () => {
    const id = pendingDelete.current;
    pendingDelete.current = null;
    undo.current = null;
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
    const removed = { finding: findings[index], index };
    undo.current = removed;
    setFindings((fs) => fs.filter((f) => f.id !== id));
    pendingDelete.current = id;
    toast.show({
      message: t.findings.deleted,
      duration: UNDO_MS,
      action: {
        label: t.findings.undo,
        onClick: () => {
          if (pendingDelete.current !== id) return;
          pendingDelete.current = null;
          undo.current = null;
          setFindings((fs) => [...fs.slice(0, removed.index), removed.finding, ...fs.slice(removed.index)]);
        },
      },
      onExpire: () => void flushDelete(),
    });
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
      toast.show({ tone: "success", message: t.findings.acceptedCount(ids.length) });
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
  };
  const photoGroup = (photo: PhotoState) => <PhotoGroup key={photo.id} photo={photo} findings={findingsOf(photo)} onRetry={() => void analyse([photo.id])} {...groupProps} />;
  const checklistHref = `/app/cars/${carId}/checklist`;

  // The add/edit sheet: "new:<photo id | general>" or a finding id.
  const editingFinding = editing && !editing.startsWith("new:") ? findings.find((f) => f.id === editing) : undefined;
  const addingTo = editing?.startsWith("new:") ? editing.slice(4) : null;
  const stepLabels = [t.car.stepPhotos, t.car.stepFindings, t.car.stepChecklist, t.car.stepReport];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <RememberStep carId={carId} step="findings" />
      <StepHeader
        step={2}
        labels={stepLabels}
        stepLabel={t.common.stepOf(2, 4)}
        back={{ href: `/app/cars/${carId}`, label: t.findings.backToCar }}
        title={t.findings.title}
        meta={
          <>
            <span className="font-semibold tracking-wider text-ink tabular">{regNumber}</span>
            {carTitle && ` · ${carTitle}`}
          </>
        }
        description={t.findings.subtitle}
      />

      {photos.length === 0 ? (
        <EmptyState icon={<CameraIcon size={24} />} title={t.findings.noPhotosTitle} body={t.findings.noPhotos}>
          <LinkButton href={`/app/cars/${carId}/inspect`} icon={<CameraIcon size={20} />}>
            {t.findings.takePhotos}
          </LinkButton>
        </EmptyState>
      ) : (
        <AnalysisProgress total={photos.length} active={active} failed={failed.length} onRetry={() => void analyse(failed.map((p) => p.id))} />
      )}

      <OdometerCard carId={carId} initialKm={odometerKm} photo={odometerPhoto} />

      <div aria-live="polite">{error && <FormError message={error} />}</div>

      {attention.length > 0 && (
        <section aria-labelledby="needs-review" className="flex flex-col gap-4">
          <h2 id="needs-review" className="px-1 text-heading">
            {t.findings.sections.attention(attention.length)}
          </h2>
          {attention.map(photoGroup)}
        </section>
      )}

      {withNotes.length > 0 && (
        <section aria-labelledby="accepted-notes" className="flex flex-col gap-4">
          <h2 id="accepted-notes" className="px-1 text-heading">
            {t.findings.sections.accepted}
          </h2>
          {withNotes.map(photoGroup)}
        </section>
      )}

      {quiet.length > 0 && (
        <details className="group rounded-card bg-surface shadow-card">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-4 py-2 transition-colors hover:bg-canvas sm:px-6 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block font-semibold">{t.findings.sections.quiet(quiet.length)}</span>
              <span className="block text-small text-ink-muted">{t.findings.sections.quietHint}</span>
            </span>
            <ChevronDownIcon size={20} className="shrink-0 text-ink-subtle transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-4 border-t border-line bg-canvas/60 p-4">{quiet.map(photoGroup)}</div>
        </details>
      )}

      {photos.length > 0 && <Group groupKey={GENERAL} title={t.findings.general} subtitle={t.findings.generalHint} findings={generalFindings} {...groupProps} />}

      <BottomSheet
        open={Boolean(editingFinding || addingTo)}
        onClose={() => setEditing(null)}
        title={editingFinding ? t.findings.editTitle : t.findings.addTitle}
        closeLabel={t.common.close}
      >
        {(editingFinding || addingTo) && (
          <FindingForm
            key={editing}
            draftKey={`finding:${carId}:${editing}`}
            initial={editingFinding ?? null}
            onCancel={() => setEditing(null)}
            onSave={(v) =>
              editingFinding ? save(v, { findingId: editingFinding.id, photoId: editingFinding.photo_id }) : save(v, { photoId: addingTo === GENERAL ? null : addingTo })
            }
          />
        )}
      </BottomSheet>

      <StickyBar>
        {active > 0 ? (
          <>
            <div className="flex flex-col gap-2">
              <p className="flex items-center justify-center gap-2 text-small font-medium tabular">
                <Spinner className="text-brand-700" />
                {t.findings.analysing(photos.length - active, photos.length)}
              </p>
            </div>
            <LinkButton href={checklistHref} variant="secondary">
              {t.findings.continueWithoutWaiting}
            </LinkButton>
          </>
        ) : toReview.length > 0 ? (
          <>
            <Button onClick={() => void acceptAllAndContinue(toReview.map((f) => f.id))} loading={continuing} icon={<CheckIcon size={20} />}>
              {t.findings.acceptAllContinue(toReview.length)}
            </Button>
            <LinkButton href={checklistHref} variant="ghost" size="sm">
              {t.findings.continueWithout}
            </LinkButton>
          </>
        ) : photos.length === 0 ? (
          <LinkButton href={`/app/cars/${carId}/inspect`} icon={<CameraIcon size={20} />}>
            {t.findings.takePhotos}
          </LinkButton>
        ) : (
          <>
            <p className={`flex items-center justify-center gap-2 text-small font-medium ${failed.length ? "text-danger-700" : "text-success-700"}`}>
              {!failed.length && <CheckIcon size={16} />}
              {failed.length ? t.findings.someFailed(failed.length) : t.findings.allReviewed}
            </p>
            <LinkButton href={checklistHref}>
              {t.findings.continue}
              <ArrowRightIcon size={20} />
            </LinkButton>
          </>
        )}
      </StickyBar>
    </div>
  );
}

function AnalysisProgress({ total, active, failed, onRetry }: { total: number; active: number; failed: number; onRetry: () => void }) {
  const t = useT();
  const done = total - active;
  const label = t.findings.analysing(done, total);
  return (
    <Card as="section" aria-live="polite">
      {active > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 font-semibold tabular">
              <Spinner className="text-brand-700" />
              {label}
            </p>
            <p className="text-small text-ink-muted">{t.findings.analysingHint}</p>
          </div>
          <ProgressBar value={done} max={total} label={label} />
        </div>
      ) : failed > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-small font-medium text-danger-700">{t.findings.someFailed(failed)}</p>
          <Button variant="secondary" size="sm" onClick={onRetry} icon={<RefreshIcon size={18} />} className="shrink-0">
            {t.findings.retryFailed}
          </Button>
        </div>
      ) : (
        <p className="flex items-center gap-2 font-semibold text-success-700">
          <span className="flex size-6 items-center justify-center rounded-full bg-success-50">
            <CheckIcon size={16} />
          </span>
          {t.findings.analysisDone}
        </p>
      )}
    </Card>
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
      <Card as="section" className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-small text-ink-muted">{t.findings.odometer.title}</h2>
          <p className="flex items-center gap-2 font-semibold tabular">
            <CheckIcon size={18} className="text-success-700" />
            {t.findings.odometer.confirmed(kmFormat.format(confirmed))}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setChanging(true)} className="shrink-0">
          {t.findings.odometer.change}
        </Button>
      </Card>
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
    <form onSubmit={onSubmit} className={`${cardClass("warning")} flex flex-col gap-4`} noValidate>
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">{t.findings.odometer.title}</h2>
        <p className="flex items-center gap-2 text-small text-ink-muted">
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
        <Button type="submit" loading={saving} disabled={!value.trim()} className={`shrink-0 ${error ? "mb-8" : ""}`}>
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
};

function PhotoGroup({ photo, findings, onRetry, ...actions }: { photo: PhotoState; findings: FindingRow[]; onRetry: () => void } & GroupActions) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const { label } = t.photos.angles[photo.angleKey];

  return (
    <Group
      groupKey={photo.id}
      title={label}
      findings={findings}
      media={
        photo.url && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={`${label}: ${expanded ? t.findings.shrinkPhoto : t.findings.enlargePhoto}`}
            className={`relative block shrink-0 overflow-hidden rounded-control transition-[width] ${expanded ? "bg-ink" : "bg-sunken"} duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${expanded ? "w-full" : "size-20"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL, not optimisable */}
            <img src={photo.url} alt="" loading="lazy" decoding="async" className={`size-full ${expanded ? "object-contain" : "object-cover"}`} />
            {!expanded && (
              <span className="absolute right-1 bottom-1 flex size-7 items-center justify-center rounded-full bg-ink/70 text-white">
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
  if (photo.run === "queued" || (!photo.run && photo.aiStatus === "pending")) return <p className="text-small text-ink-muted">{s.queued}</p>;
  if (photo.run === "running")
    return (
      <p className="flex items-center gap-2 text-small text-ink-muted">
        <Spinner className="text-brand-700" />
        {s.pending}
      </p>
    );
  const retake = (
    <Link
      href={`/app/cars/${carId}/inspect?angle=${photo.angleKey}`}
      className="-mx-2 inline-flex min-h-11 items-center gap-2 rounded-chip px-2 text-small font-semibold text-brand-700 transition-colors hover:bg-brand-50"
    >
      <RefreshIcon size={16} />
      {t.findings.retakePhoto}
    </Link>
  );
  if (photo.limitReached)
    return (
      <div>
        <p className="text-small font-medium text-danger-700">{s.limit}</p>
        {retake}
      </div>
    );
  if (photo.run === "error" || photo.aiStatus === "failed")
    return (
      <div>
        <p className="text-small font-medium text-danger-700">{s.failed}</p>
        <div className="flex flex-wrap gap-x-4">
          <TextButton onClick={onRetry}>
            <RefreshIcon size={16} />
            {t.findings.tryAgain}
          </TextButton>
          {retake}
        </div>
      </div>
    );
  if (photo.aiStatus === "unclear")
    return (
      <div>
        <p className="text-small font-medium text-warning-700">{s.unclear}</p>
        {retake}
      </div>
    );
  return <p className="text-small text-ink-muted">{findingCount === 0 ? s.noDamage : s.done}</p>;
}

function Group({
  groupKey,
  title,
  subtitle,
  findings,
  media,
  status,
  editing,
  setEditing,
  onAccept,
  onDelete,
}: {
  groupKey: string;
  title: string;
  subtitle?: string;
  findings: FindingRow[];
  media?: ReactNode;
  status?: ReactNode;
} & GroupActions) {
  const t = useT();
  return (
    <Card as="section" aria-label={title}>
      <div className="flex flex-wrap items-start gap-4">
        {media}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-small text-ink-muted">{subtitle}</p>}
          {status}
        </div>
      </div>

      {findings.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {findings.map((f) => (
            <li key={f.id}>
              <FindingCard finding={f} onAccept={(a) => onAccept(f.id, a)} onEdit={() => setEditing(f.id)} onDelete={() => onDelete(f.id)} />
            </li>
          ))}
        </ul>
      )}

      <TextButton onClick={() => setEditing(`new:${groupKey}`)} className="mt-2" aria-pressed={editing === `new:${groupKey}`}>
        <PlusIcon size={18} />
        {t.findings.add}
      </TextButton>
    </Card>
  );
}

function FindingCard({ finding, onAccept, onEdit, onDelete }: { finding: FindingRow; onAccept: (accepted: boolean) => void; onEdit: () => void; onDelete: () => void }) {
  const t = useT();
  // Edit and Delete are compact (icon over a short label) so the row fits a 360px screen in any language.
  const compact = "min-h-12 w-16 shrink-0 flex-col !gap-0.5 !px-1 !text-caption";

  return (
    <article
      className={`relative overflow-hidden rounded-control p-4 pl-5 ring-1 ring-inset before:absolute before:inset-y-0 before:left-0 before:w-1 ${SEVERITY_EDGE[finding.severity]} ${
        finding.accepted ? "bg-surface ring-line" : "bg-surface ring-2 ring-warning-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{t.findings.types[finding.type]}</span>
        <Badge tone={SEVERITY_TONE[finding.severity]}>{t.findings.severities[finding.severity]}</Badge>
        {finding.source === "ai" && (
          <Badge icon={<SparklesIcon size={12} />} className="!bg-surface ring-1 ring-line ring-inset">
            {t.findings.aiSuggestion}
          </Badge>
        )}
        <span className={`ml-auto inline-flex items-center gap-1 text-caption font-semibold ${finding.accepted ? "text-success-700" : "text-warning-700"}`}>
          {finding.accepted && <CheckIcon size={14} />}
          {finding.accepted ? t.findings.accepted : t.findings.needsReview}
        </span>
      </div>
      {finding.location && <p className="mt-2 text-small font-medium">{finding.location}</p>}
      {finding.note && <p className="mt-1 text-small text-ink-muted">{finding.note}</p>}

      <div className="mt-4 flex gap-2">
        {finding.accepted ? (
          <Button variant="secondary" size="sm" onClick={() => onAccept(false)} icon={<UndoIcon size={16} />} className="min-w-0 flex-1 !px-2">
            {t.findings.unaccept}
          </Button>
        ) : (
          <Button size="sm" onClick={() => onAccept(true)} icon={<CheckIcon size={16} />} className="min-w-0 flex-1 !px-2">
            {t.findings.accept}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onEdit} className={compact} aria-label={`${t.findings.edit}: ${t.findings.types[finding.type]}`}>
          <PencilIcon size={16} />
          {t.findings.edit}
        </Button>
        <Button variant="secondary" size="sm" onClick={onDelete} className={`${compact} !text-danger-700`} aria-label={`${t.findings.delete}: ${t.findings.types[finding.type]}`}>
          <TrashIcon size={16} />
          {t.findings.delete}
        </Button>
      </div>
    </article>
  );
}

type FindingFormValues = FindingFormInput;

function FindingForm({
  draftKey,
  initial,
  onSave,
  onCancel,
}: {
  draftKey: string;
  initial: FindingRow | null;
  onSave: (values: FindingFormValues) => Promise<SaveFindingResult>;
  onCancel: () => void;
}) {
  const t = useT();
  // What was typed last time this form was open (closed by accident, phone call…) comes back.
  const [draft] = useState(() => readDraft<{ type: string; severity: string; location: string; note: string }>(draftKey));
  const [type, setType] = useState<FindingType | "">((draft?.type as FindingType | undefined) ?? initial?.type ?? "");
  const [severity, setSeverity] = useState<Severity | null>((draft?.severity as Severity | undefined) || initial?.severity || null);
  const [location, setLocation] = useState(draft?.location ?? initial?.location ?? "");
  const [note, setNote] = useState(draft?.note ?? initial?.note ?? "");
  useEffect(() => saveDraft(draftKey, { type, severity: severity ?? "", location, note }), [draftKey, type, severity, location, note]);
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
    if (result.ok) clearDraft(draftKey);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error ?? null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
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
        <p className="mb-2 text-small font-medium">{t.findings.severity}</p>
        <Segmented
          label={t.findings.severity}
          options={severityOptions(t)}
          value={severity}
          onChange={(v) => {
            setSeverity(v);
            setErrors((x) => ({ ...x, severity: undefined }));
          }}
        />
        <FieldMessage error={errors.severity} />
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
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            clearDraft(draftKey);
            onCancel();
          }}
          disabled={saving}
        >
          {t.findings.cancel}
        </Button>
        <Button type="submit" loading={saving}>
          {saving ? t.findings.saving : t.findings.save}
        </Button>
      </div>
    </form>
  );
}
