"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackLink, Button, StickyActions } from "@/components/button";
import { useOnline } from "@/components/connection-banner";
import { FormError, TextAreaField } from "@/components/field";
import { useT } from "@/components/i18n-provider";
import { AlertIcon, CheckIcon, ChevronRightIcon, CloudUploadIcon, HelpIcon, PlusIcon, XIcon } from "@/components/icons";
import { Segmented, type SegmentOption } from "@/components/segmented";
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

const resultOptions = (t: Strings): readonly SegmentOption<ChecklistResult>[] => [
  { value: "ok", label: t.checklist.results.ok, icon: <CheckIcon size={16} />, selectedClass: "border-emerald-700 bg-emerald-700 text-white" },
  { value: "attention", label: t.checklist.results.attention, icon: <AlertIcon size={16} />, selectedClass: "border-amber-500 bg-amber-400 text-amber-950" },
  { value: "fail", label: t.checklist.results.fail, icon: <XIcon size={16} />, selectedClass: "border-red-700 bg-red-700 text-white" },
  { value: "na", label: t.checklist.results.na, selectedClass: "border-slate-700 bg-slate-700 text-white" },
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

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/app/cars/${carId}`}>{t.checklist.backToCar}</BackLink>

      <header>
        <h1 className="text-xl font-bold">{t.checklist.title}</h1>
        <p className="text-sm text-slate-700">
          <span className="font-semibold tracking-wider">{regNumber}</span>
          {carTitle && ` · ${carTitle}`}
        </p>
        <p className="mt-2 text-sm text-slate-700">{t.checklist.subtitle}</p>
      </header>

      <section className="rounded-2xl border border-line bg-white p-4" aria-label={label}>
        <p className="text-2xl font-bold">{label}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
          <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
      </section>

      {waiting > 0 && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800">
          <CloudUploadIcon size={18} className="mt-px text-brand-700" />
          {t.checklist.waitingCount(waiting)}
        </p>
      )}

      {CHECKLIST_GROUPS.map((group) => (
        <section key={group.key} className="rounded-2xl border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 font-semibold">{t.checklist.groups[group.key]}</h2>
          <ul className="divide-y divide-line">
            {group.items.map((key) => (
              <li key={key} className="px-4 py-3">
                <ChecklistRow
                  itemKey={key}
                  item={items[key]}
                  onChoose={(r) => choose(key, r)}
                  onNoteChange={(note) => update(key, { note })}
                  onNoteBlur={() => void persist(key)}
                  onOpenNote={() => update(key, { noteOpen: true })}
                  onToggleHelp={() => update(key, { helpOpen: !items[key].helpOpen })}
                  onRetry={() => void persist(key)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <StickyActions>
        {confirmRest ? (
          <div role="alertdialog" aria-labelledby="mark-rest" className="flex flex-col gap-2">
            <p id="mark-rest" className="text-sm font-medium text-slate-900">
              {t.checklist.markRestConfirm(remaining)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirmRest(false)} autoFocus>
                {t.common.cancel}
              </Button>
              <Button onClick={() => void markRestOk()}>{t.checklist.markRestYes}</Button>
            </div>
          </div>
        ) : (
          <>
            <p aria-live="polite" className={`text-center text-sm ${progress.complete ? "text-brand-800" : "text-slate-800"}`}>
              {progress.complete ? (finished ? t.checklist.finished : t.checklist.allDone) : t.checklist.finishHint(remaining)}
            </p>
            <FormError message={finishError ?? (!online && progress.complete ? t.checklist.finishOffline : null)} />
            {progress.complete ? (
              <Button onClick={() => void onFinish()} loading={finishing} disabled={!online}>
                {finished ? t.checklist.backToCarDone : t.checklist.finish}
                <ChevronRightIcon />
              </Button>
            ) : (
              progress.done > 0 && (
                <Button variant="secondary" onClick={() => setConfirmRest(true)}>
                  <CheckIcon size={18} />
                  {t.checklist.markRestOk(remaining)}
                </Button>
              )
            )}
          </>
        )}
      </StickyActions>
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
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-slate-700">{hint}</p>
        </div>
        <SaveState state={item.save} onRetry={onRetry} />
      </div>
      {item.helpOpen && (
        <p id={helpId} className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
          {how}
        </p>
      )}
      <Segmented label={label} options={resultOptions(t)} value={item.result} onChange={onChoose} columns="grid-cols-2 min-[420px]:grid-cols-4" />
      <div className="flex flex-wrap gap-x-4">
        {!item.noteOpen && (
          <button type="button" onClick={onOpenNote} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700">
            <PlusIcon size={16} />
            {t.checklist.addNote}
          </button>
        )}
        <button type="button" onClick={onToggleHelp} aria-expanded={item.helpOpen} aria-controls={helpId} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700">
          <HelpIcon size={16} />
          {t.checklist.howToCheck}
        </button>
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
  if (state === "saving") return <span className="shrink-0 text-xs text-slate-600">{t.checklist.saving}</span>;
  if (state === "saved")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-800">
        <CheckIcon size={14} />
        {t.checklist.saved}
      </span>
    );
  if (state === "waiting")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-700">
        <CloudUploadIcon size={14} />
        {t.checklist.waiting}
      </span>
    );
  if (state === "error")
    return (
      <button type="button" onClick={onRetry} className="min-h-11 shrink-0 text-right text-xs font-semibold text-red-800">
        {t.checklist.saveFailed}
      </button>
    );
  return null;
}
