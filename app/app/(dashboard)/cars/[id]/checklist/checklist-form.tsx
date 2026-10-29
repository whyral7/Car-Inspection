"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOnline } from "@/components/connection-banner";
import { useT } from "@/components/i18n-provider";
import { AlertIcon, ArrowRightIcon, CheckIcon, CloudUploadIcon, HelpIcon, PlusIcon, XIcon } from "@/components/icons";
import { RememberStep } from "@/components/remember-step";
import { Button, Card, ConfirmSheet, FormError, ProgressBar, Segmented, StepHeader, StickyBar, TextAreaField, TextButton, useToast, type SegmentOption } from "@/components/ui";
import { CHECKLIST_GROUPS, CHECKLIST_KEYS, checklistProgress, type ChecklistKey } from "@/lib/checklist";
import { FINDING_LIMITS } from "@/lib/findings";
import { checklistOutbox } from "@/lib/outbox";
import type { Strings } from "@/lib/strings";
import type { ChecklistResult } from "@/lib/supabase/database.types";
import { finishInspection, saveChecklistItem, saveChecklistItems } from "./actions";

// Every answer is written to the phone's outbox first, then sent. Failed sends (no signal) are
// retried when the connection comes back and every RETRY_MS while online, so nothing is lost and
// nobody has to hunt for red "not saved" items before finishing.

type SaveState = "idle" | "saving" | "saved" | "waiting" | "error";
type Item = {
  result: ChecklistResult | null;
  note: string;
  noteOpen: boolean;
  helpOpen: boolean;
  save: SaveState;
};
type Items = Record<ChecklistKey, Item>;

const RETRY_MS = 15_000;
/** A note is saved this long after the last keystroke (and on leaving the box). */
const NOTE_SAVE_MS = 1_200;

const resultOptions = (t: Strings): readonly SegmentOption<ChecklistResult>[] => [
  { value: "ok", label: t.checklist.results.ok, icon: <CheckIcon size={16} />, selectedClass: "bg-success-700 text-white ring-success-700" },
  { value: "attention", label: t.checklist.results.attention, icon: <AlertIcon size={16} />, selectedClass: "bg-warning-500 text-ink ring-warning-500" },
  { value: "fail", label: t.checklist.results.fail, icon: <XIcon size={16} />, selectedClass: "bg-danger-700 text-white ring-danger-700" },
  { value: "na", label: t.checklist.results.na, selectedClass: "bg-ink-muted text-white ring-ink-muted" },
];

type Props = {
  carId: string;
  regNumber: string;
  carTitle: string;
  finished: boolean;
  initial: Partial<Record<ChecklistKey, { result: ChecklistResult; note: string }>>;
};

export function ChecklistForm({ carId, regNumber, carTitle, finished, initial }: Props) {
  const t = useT();
  const router = useRouter();
  const online = useOnline();
  const toast = useToast();
  const [items, setItems] = useState<Items>(() => {
    const entries = CHECKLIST_KEYS.map((key) => {
      const saved = initial[key];
      return [key, { result: saved?.result ?? null, note: saved?.note ?? "", noteOpen: Boolean(saved?.note), helpOpen: false, save: "idle" } satisfies Item];
    });
    return Object.fromEntries(entries) as Items;
  });
  // The latest values, read by queued saves, and one save chain per item so taps land in order.
  const itemsRef = useRef(items);
  const chains = useRef(new Map<ChecklistKey, Promise<void>>());
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [confirmRest, setConfirmRest] = useState(false);

  const update = useCallback((key: ChecklistKey, patch: Partial<Item>) => {
    itemsRef.current = { ...itemsRef.current, [key]: { ...itemsRef.current[key], ...patch } };
    setItems(itemsRef.current);
  }, []);

  const persist = useCallback(
    (key: ChecklistKey) => {
      const previous = chains.current.get(key) ?? Promise.resolve();
      const next = previous.then(async () => {
        const { result, note } = itemsRef.current[key];
        if (!result) return;
        const value = { item_key: key, result, note: note.trim() || null };
        await checklistOutbox.put({ carId, itemKey: key, result, note: value.note });
        if (!navigator.onLine) {
          update(key, { save: "waiting" });
          return;
        }
        update(key, { save: "saving" });
        try {
          const res = await saveChecklistItem(carId, value);
          if (!res.ok) throw new Error(res.error);
          // Only clear the outbox if nothing newer was chosen while this was sending.
          const now = itemsRef.current[key];
          if (now.result === result && (now.note.trim() || null) === value.note) await checklistOutbox.remove(carId, key);
          update(key, { save: "saved" });
        } catch {
          update(key, { save: navigator.onLine ? "error" : "waiting" });
        }
      });
      chains.current.set(key, next);
      return next;
    },
    [carId, update],
  );

  const resendUnsaved = useCallback(() => {
    for (const key of CHECKLIST_KEYS) {
      const s = itemsRef.current[key].save;
      if (s === "waiting" || s === "error") void persist(key);
    }
  }, [persist]);

  // Answers left on the phone by an earlier visit win over the server's older copy; send them now.
  useEffect(() => {
    let cancelled = false;
    void checklistOutbox.list(carId).then((entries) => {
      if (cancelled) return;
      for (const e of entries) {
        if (!(CHECKLIST_KEYS as readonly string[]).includes(e.itemKey)) continue;
        const key = e.itemKey as ChecklistKey;
        update(key, { result: e.result, note: e.note ?? "", noteOpen: Boolean(e.note), save: "waiting" });
        void persist(key);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [carId, persist, update]);

  useEffect(() => {
    window.addEventListener("online", resendUnsaved);
    const timer = setInterval(() => navigator.onLine && resendUnsaved(), RETRY_MS);
    return () => {
      window.removeEventListener("online", resendUnsaved);
      clearInterval(timer);
    };
  }, [resendUnsaved]);

  // Back on a half-done checklist: start at the first unanswered item.
  useEffect(() => {
    const answered = CHECKLIST_KEYS.filter((k) => initial[k]);
    const first = CHECKLIST_KEYS.find((k) => !initial[k]);
    if (answered.length > 0 && first) document.getElementById(`item-${first}`)?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  const noteTimers = useRef(new Map<ChecklistKey, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = noteTimers.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  function changeNote(key: ChecklistKey, note: string) {
    update(key, { note });
    clearTimeout(noteTimers.current.get(key));
    noteTimers.current.set(key, setTimeout(() => void persist(key), NOTE_SAVE_MS));
  }

  function choose(key: ChecklistKey, result: ChecklistResult) {
    // Open the note box for anything worth explaining to a buyer.
    const openNote = result === "attention" || result === "fail" ? { noteOpen: true } : {};
    update(key, { result, ...openNote });
    void persist(key);
  }

  async function markRestOk() {
    setConfirmRest(false);
    const rest = CHECKLIST_KEYS.filter((k) => !itemsRef.current[k].result);
    if (rest.length === 0) return;
    for (const key of rest) {
      update(key, { result: "ok", save: "saving" });
      await checklistOutbox.put({ carId, itemKey: key, result: "ok", note: null });
    }
    try {
      if (!navigator.onLine) throw new Error("offline");
      const res = await saveChecklistItems(
        carId,
        rest.map((key) => ({ item_key: key, result: "ok", note: null })),
      );
      if (!res.ok) throw new Error(res.error);
      for (const key of rest) {
        await checklistOutbox.remove(carId, key);
        update(key, { save: "saved" });
      }
    } catch {
      for (const key of rest) update(key, { save: navigator.onLine ? "error" : "waiting" });
    }
  }

  async function onFinish() {
    setFinishError(null);
    if (!navigator.onLine) {
      setFinishError(t.checklist.finishOffline);
      return;
    }
    setFinishing(true);
    try {
      resendUnsaved();
      await Promise.all(chains.current.values());
      if (CHECKLIST_KEYS.some((k) => ["error", "waiting"].includes(itemsRef.current[k].save))) throw new Error("unsaved");
      const res = await finishInspection(carId);
      if (!res.ok) {
        setFinishError(res.error);
        return;
      }
      if (!finished) toast.show({ tone: "success", message: t.checklist.finished });
      router.push(`/app/cars/${carId}/report`);
      router.refresh();
    } catch {
      setFinishError(navigator.onLine ? t.checklist.saveFailed : t.common.offline);
    } finally {
      setFinishing(false);
    }
  }

  const progress = checklistProgress(CHECKLIST_KEYS.filter((k) => items[k].result));
  const remaining = progress.total - progress.done;
  const waiting = CHECKLIST_KEYS.filter((k) => items[k].save === "waiting").length;
  const label = t.checklist.progress(progress.done, progress.total);

  const stepLabels = [t.car.stepPhotos, t.car.stepFindings, t.car.stepChecklist, t.car.stepReport];
  return (
    <div className="flex flex-1 flex-col gap-6">
      <RememberStep carId={carId} step="checklist" />
      <StepHeader
        step={3}
        labels={stepLabels}
        stepLabel={t.common.stepOf(3, 4)}
        back={{ href: `/app/cars/${carId}`, label: t.checklist.backToCar }}
        title={t.checklist.title}
        meta={
          <>
            <span className="font-semibold tracking-wider text-ink tabular">{regNumber}</span>
            {carTitle && ` · ${carTitle}`}
          </>
        }
        description={t.checklist.subtitle}
      />

      <Card className="flex flex-col gap-4" aria-label={label}>
        <p className="text-title tabular">{label}</p>
        <ProgressBar value={progress.done} max={progress.total} label={label} />
      </Card>

      {waiting > 0 && (
        <p role="status" className="flex animate-rise-in items-start gap-2 rounded-control bg-brand-50 px-4 py-3 text-small text-brand-900">
          <CloudUploadIcon size={18} className="mt-px text-brand-700" />
          {t.checklist.waitingCount(waiting)}
        </p>
      )}

      {CHECKLIST_GROUPS.map((group) => (
        <section key={group.key} aria-labelledby={`group-${group.key}`} className="flex flex-col gap-2">
          <h2 id={`group-${group.key}`} className="px-1 text-heading">
            {t.checklist.groups[group.key]}
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
            {group.items.map((key) => (
              <li key={key} id={`item-${key}`} className="scroll-mt-24 px-4 py-4 sm:px-6">
                <ChecklistRow
                  itemKey={key}
                  item={items[key]}
                  onChoose={(r) => choose(key, r)}
                  onNoteChange={(note) => changeNote(key, note)}
                  onNoteBlur={() => {
                    clearTimeout(noteTimers.current.get(key));
                    void persist(key);
                  }}
                  onOpenNote={() => update(key, { noteOpen: true })}
                  onToggleHelp={() => update(key, { helpOpen: !items[key].helpOpen })}
                  onRetry={() => void persist(key)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <ConfirmSheet
        open={confirmRest}
        onClose={() => setConfirmRest(false)}
        title={t.checklist.markRestOk(remaining)}
        description={t.checklist.markRestConfirm(remaining)}
        confirmLabel={t.checklist.markRestYes}
        cancelLabel={t.common.cancel}
        closeLabel={t.common.close}
        variant="primary"
        errorFallback={t.checklist.saveFailed}
        onConfirm={() => void markRestOk()}
      />

      <StickyBar>
        <p aria-live="polite" className={`flex items-center justify-center gap-2 text-center text-small ${progress.complete ? "font-medium text-success-700" : "text-ink-muted"}`}>
          {progress.complete && <CheckIcon size={16} />}
          {progress.complete ? (finished ? t.checklist.finished : t.checklist.allDone) : t.checklist.finishHint(remaining)}
        </p>
        <FormError message={finishError ?? (!online && progress.complete ? t.checklist.finishOffline : null)} />
        {progress.complete ? (
          <Button onClick={() => void onFinish()} loading={finishing} disabled={!online}>
            {finished ? t.checklist.backToCarDone : t.checklist.finish}
            <ArrowRightIcon size={20} />
          </Button>
        ) : (
          progress.done > 0 && (
            <Button variant="secondary" onClick={() => setConfirmRest(true)} icon={<CheckIcon size={18} />}>
              {t.checklist.markRestOk(remaining)}
            </Button>
          )
        )}
      </StickyBar>
    </div>
  );
}

function ChecklistRow({
  itemKey,
  item,
  onChoose,
  onNoteChange,
  onNoteBlur,
  onOpenNote,
  onToggleHelp,
  onRetry,
}: {
  itemKey: ChecklistKey;
  item: Item;
  onChoose: (r: ChecklistResult) => void;
  onNoteChange: (note: string) => void;
  onNoteBlur: () => void;
  onOpenNote: () => void;
  onToggleHelp: () => void;
  onRetry: () => void;
}) {
  const t = useT();
  const { label, hint, how } = t.checklist.items[itemKey];
  const helpId = `how-${itemKey}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-semibold">{label}</p>
          <p className="text-small text-ink-muted">{hint}</p>
        </div>
        <SaveState state={item.save} onRetry={onRetry} />
      </div>
      {item.helpOpen && (
        <p id={helpId} className="animate-rise-in rounded-control bg-brand-50 p-4 text-small text-brand-900">
          {how}
        </p>
      )}
      <Segmented label={label} options={resultOptions(t)} value={item.result} onChange={onChoose} columns="grid-cols-2 min-[420px]:grid-cols-4" />
      <div className="-my-2 flex flex-wrap gap-x-6">
        {!item.noteOpen && (
          <TextButton onClick={onOpenNote}>
            <PlusIcon size={16} />
            {t.checklist.addNote}
          </TextButton>
        )}
        <TextButton onClick={onToggleHelp} aria-expanded={item.helpOpen} aria-controls={helpId}>
          <HelpIcon size={16} />
          {t.checklist.howToCheck}
        </TextButton>
      </div>
      {item.noteOpen && (
        <TextAreaField
          label={t.checklist.noteLabel}
          name={`note-${itemKey}`}
          value={item.note}
          onChange={(e) => onNoteChange(e.target.value)}
          onBlur={onNoteBlur}
          placeholder={t.checklist.notePlaceholder}
          maxLength={FINDING_LIMITS.noteChars}
        />
      )}
    </div>
  );
}

function SaveState({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const t = useT();
  if (state === "saving") return <span className="shrink-0 text-caption text-ink-muted">{t.checklist.saving}</span>;
  if (state === "saved")
    return (
      <span className="inline-flex shrink-0 animate-fade-in items-center gap-1 text-caption font-semibold text-success-700">
        <CheckIcon size={14} />
        {t.checklist.saved}
      </span>
    );
  if (state === "waiting")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-caption font-semibold text-ink-muted">
        <CloudUploadIcon size={14} />
        {t.checklist.waiting}
      </span>
    );
  if (state === "error")
    return (
      <button type="button" onClick={onRetry} className="min-h-11 shrink-0 text-right text-caption font-semibold text-danger-700">
        {t.checklist.saveFailed}
      </button>
    );
  return null;
}
