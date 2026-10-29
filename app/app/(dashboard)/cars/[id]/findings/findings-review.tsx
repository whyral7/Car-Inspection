"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { AnalyseResponse } from "@/app/api/photos/[photoId]/analyse/route";
import { Button, LinkButton } from "@/components/button";
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

  const remove = (id: string) =>
    act(
      (fs) => fs.filter((f) => f.id !== id),
      () => deleteFinding(id),
    );

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

  const photoIds = new Set(photos.map((p) => p.id));
  const generalFindings = findings.filter((f) => !f.photo_id || !photoIds.has(f.photo_id));
  const toReview = findings.filter((f) => !f.accepted);
  const active = photos.filter((p) => p.run === "queued" || p.run === "running").length;
  const failed = photos.filter((p) => p.run === "error" || (!p.run && p.aiStatus === "failed"));
  const odometerPhoto = photos.find((p) => p.angleKey === "odometer");

  const groupProps = {
    carId,
    editing,
    setEditing,
    onAccept: (id: string, accepted: boolean) => void setAccepted([id], accepted),
    onDelete: (id: string) => void remove(id),
    onSave: save,
  };

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/app/cars/${carId}`} className="-ml-1 inline-flex min-h-11 items-center self-start px-1 text-sm font-medium text-brand-700">
        ← {t.findings.backToCar}
      </Link>

      <header>
        <h1 className="text-xl font-bold">{t.findings.title}</h1>
        <p className="text-sm text-slate-600">
          <span className="font-semibold tracking-wider">{regNumber}</span>
          {carTitle && ` · ${carTitle}`}
        </p>
        <p className="mt-2 text-sm text-slate-600">{t.findings.subtitle}</p>
      </header>

      {photos.length === 0 ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
          <p className="text-slate-700">{t.findings.noPhotos}</p>
          <LinkButton href={`/app/cars/${carId}/inspect`}>{t.findings.takePhotos}</LinkButton>
        </section>
      ) : (
        <AnalysisProgress total={photos.length} active={active} failed={failed.length} onRetry={() => void analyse(failed.map((p) => p.id))} />
      )}

      <OdometerCard carId={carId} initialKm={odometerKm} photo={odometerPhoto} />

      <div aria-live="polite">{error && <FormError message={error} />}</div>

      {photos.map((photo) => (
        <PhotoGroup
          key={photo.id}
          photo={photo}
          findings={findings.filter((f) => f.photo_id === photo.id)}
          onRetry={() => void analyse([photo.id])}
          {...groupProps}
        />
      ))}

      <Group groupKey={GENERAL} title={t.findings.general} subtitle={t.findings.generalHint} photoId={null} findings={generalFindings} {...groupProps} />

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <p className={`text-center text-sm ${toReview.length ? "text-slate-700" : "text-brand-800"}`}>
          {toReview.length ? t.findings.toReview(toReview.length) : t.findings.allReviewed}
        </p>
        {toReview.length > 0 && (
          <Button variant="secondary" onClick={() => void setAccepted(toReview.map((f) => f.id), true)}>
            {t.findings.acceptAll(toReview.length)}
          </Button>
        )}
        <LinkButton href={`/app/cars/${carId}/checklist`}>{t.findings.continue}</LinkButton>
      </div>
    </div>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

function AnalysisProgress({ total, active, failed, onRetry }: { total: number; active: number; failed: number; onRetry: () => void }) {
  const t = useT();
  const done = total - active;
  return (
    <section aria-live="polite" className="rounded-2xl border border-line bg-white p-4">
      {active > 0 ? (
        <>
          <p className="flex items-center gap-2 font-semibold">
            <Spinner className="text-brand-700" />
            {t.findings.analysing(done, total)}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
            <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </>
      ) : failed > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-red-700">{t.findings.someFailed(failed)}</p>
          <Button variant="secondary" onClick={onRetry} className="min-h-11 shrink-0 px-4 text-sm">
            {t.findings.retryFailed}
          </Button>
        </div>
      ) : (
        <p className="font-medium text-brand-800">✓ {t.findings.analysisDone}</p>
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
          <p className="font-semibold">✓ {t.findings.odometer.confirmed(kmFormat.format(confirmed))}</p>
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
            aria-label={label}
            className={`block shrink-0 overflow-hidden rounded-xl bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${expanded ? "w-full" : "size-20"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL, not optimisable */}
            <img src={photo.url} alt="" loading="lazy" decoding="async" className={`size-full ${expanded ? "object-contain" : "object-cover"}`} />
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
  if (photo.run === "queued" || (!photo.run && photo.aiStatus === "pending")) return <p className="text-sm text-slate-600">{s.queued}</p>;
  if (photo.run === "running")
    return (
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <Spinner className="text-brand-700" />
        {s.pending}
      </p>
    );
  const retake = (
    <Link href={`/app/cars/${carId}/inspect?angle=${photo.angleKey}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700">
      {t.findings.retakePhoto}
    </Link>
  );
  if (photo.limitReached)
    return (
      <div>
        <p className="text-sm text-red-700">{s.limit}</p>
        {retake}
      </div>
    );
  if (photo.run === "error" || photo.aiStatus === "failed")
    return (
      <div className="flex flex-wrap items-center gap-x-4">
        <p className="text-sm text-red-700">{s.failed}</p>
        <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700">
          {t.findings.tryAgain}
        </button>
      </div>
    );
  if (photo.aiStatus === "unclear")
    return (
      <div>
        <p className="text-sm text-amber-800">{s.unclear}</p>
        {retake}
      </div>
    );
  return <p className="text-sm text-slate-600">{findingCount === 0 ? s.noDamage : s.done}</p>;
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
          {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
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
          + {t.findings.add}
        </Button>
      )}
    </section>
  );
}

function FindingCard({ finding, onAccept, onEdit, onDelete }: { finding: FindingRow; onAccept: (accepted: boolean) => void; onEdit: () => void; onDelete: () => void }) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const small = "min-h-11 flex-1 px-2 text-sm";

  return (
    <article className={`rounded-xl border p-3 ${finding.accepted ? "border-line bg-white" : "border-amber-300 bg-amber-50"}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold">{t.findings.types[finding.type]}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${severityChip[finding.severity]}`}>{t.findings.severities[finding.severity]}</span>
        <span className="ml-auto text-xs font-medium text-slate-600">
          {finding.accepted ? `✓ ${t.findings.accepted}` : t.findings.needsReview} · {finding.source === "ai" ? t.findings.fromAi : t.findings.fromDealer}
        </span>
      </div>
      {finding.location && <p className="mt-1 text-sm font-medium text-slate-800">{finding.location}</p>}
      {finding.note && <p className="mt-0.5 text-sm text-slate-600">{finding.note}</p>}

      {confirming ? (
        <div className="mt-2 flex items-center gap-2">
          <p className="flex-1 text-sm font-medium text-red-700">{t.findings.confirmDelete}</p>
          <Button variant="secondary" onClick={() => setConfirming(false)} className="min-h-11 px-3 text-sm">
            {t.findings.cancel}
          </Button>
          <Button onClick={onDelete} className="min-h-11 bg-red-600 px-3 text-sm active:bg-red-700">
            {t.findings.delete}
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          {finding.accepted ? (
            <Button variant="secondary" onClick={() => onAccept(false)} className={small}>
              {t.findings.unaccept}
            </Button>
          ) : (
            <Button onClick={() => onAccept(true)} className={small}>
              {t.findings.accept}
            </Button>
          )}
          <Button variant="secondary" onClick={onEdit} className={small}>
            {t.findings.edit}
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(true)} className={`${small} text-red-700`}>
            {t.findings.delete}
          </Button>
        </div>
      )}
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
