"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/button";
import { FormError, TextAreaField } from "@/components/field";
import { Segmented, type SegmentOption } from "@/components/segmented";
import { CHECKLIST_GROUPS, CHECKLIST_KEYS, checklistProgress, type ChecklistKey } from "@/lib/checklist";
import { FINDING_LIMITS } from "@/lib/findings";
import { useT } from "@/components/i18n-provider";
import type { Strings } from "@/lib/strings";
import type { ChecklistResult } from "@/lib/supabase/database.types";
import { finishInspection, saveChecklistItem } from "./actions";

type Item = {
  result: ChecklistResult | null;
  note: string;
  noteOpen: boolean;
  save: "idle" | "saving" | "saved" | "error";
};
type Items = Record<ChecklistKey, Item>;

const resultOptions = (t: Strings): readonly SegmentOption<ChecklistResult>[] => [
  { value: "ok", label: t.checklist.results.ok, selectedClass: "border-emerald-600 bg-emerald-600 text-white" },
  { value: "attention", label: t.checklist.results.attention, selectedClass: "border-amber-500 bg-amber-400 text-amber-950" },
  { value: "fail", label: t.checklist.results.fail, selectedClass: "border-red-600 bg-red-600 text-white" },
  { value: "na", label: t.checklist.results.na, selectedClass: "border-slate-600 bg-slate-600 text-white" },
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
  const [items, setItems] = useState<Items>(() => {
    const entries = CHECKLIST_KEYS.map((key) => {
      const saved = initial[key];
      return [key, { result: saved?.result ?? null, note: saved?.note ?? "", noteOpen: Boolean(saved?.note), save: "idle" } satisfies Item];
    });
    return Object.fromEntries(entries) as Items;
  });
  // The latest values, read by queued saves, and one save chain per item so taps land in order.
  const itemsRef = useRef(items);
  const chains = useRef(new Map<ChecklistKey, Promise<void>>());
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  function update(key: ChecklistKey, patch: Partial<Item>) {
    itemsRef.current = { ...itemsRef.current, [key]: { ...itemsRef.current[key], ...patch } };
    setItems(itemsRef.current);
  }

  function persist(key: ChecklistKey) {
    const previous = chains.current.get(key) ?? Promise.resolve();
    const next = previous.then(async () => {
      const { result, note } = itemsRef.current[key];
      if (!result) return;
      update(key, { save: "saving" });
      try {
        const res = await saveChecklistItem(carId, { item_key: key, result, note: note.trim() || null });
        update(key, { save: res.ok ? "saved" : "error" });
      } catch {
        update(key, { save: "error" });
      }
    });
    chains.current.set(key, next);
    return next;
  }

  function choose(key: ChecklistKey, result: ChecklistResult) {
    // Open the note box for anything worth explaining to a buyer.
    const openNote = result === "attention" || result === "fail" ? { noteOpen: true } : {};
    update(key, { result, ...openNote });
    void persist(key);
  }

  async function onFinish() {
    setFinishError(null);
    setFinishing(true);
    try {
      await Promise.all(chains.current.values());
      if (CHECKLIST_KEYS.some((k) => itemsRef.current[k].save === "error")) throw new Error("unsaved");
      const res = await finishInspection(carId);
      if (!res.ok) {
        setFinishError(res.error);
        return;
      }
      router.push(`/app/cars/${carId}`);
      router.refresh();
    } catch {
      setFinishError(navigator.onLine ? t.checklist.saveFailed : t.common.offline);
    } finally {
      setFinishing(false);
    }
  }

  const progress = checklistProgress(CHECKLIST_KEYS.filter((k) => items[k].result));

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/app/cars/${carId}`} className="-ml-1 inline-flex min-h-11 items-center self-start px-1 text-sm font-medium text-brand-700">
        ← {t.checklist.backToCar}
      </Link>

      <header>
        <h1 className="text-xl font-bold">{t.checklist.title}</h1>
        <p className="text-sm text-slate-600">
          <span className="font-semibold tracking-wider">{regNumber}</span>
          {carTitle && ` · ${carTitle}`}
        </p>
        <p className="mt-2 text-sm text-slate-600">{t.checklist.subtitle}</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label={t.checklist.progress(progress.done, progress.total)}>
        <p className="text-2xl font-bold">{t.checklist.progress(progress.done, progress.total)}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
          <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
      </section>

      {CHECKLIST_GROUPS.map((group) => (
        <section key={group.key} className="rounded-2xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-4 py-3 font-semibold">{t.checklist.groups[group.key]}</h2>
          <ul className="divide-y divide-slate-100">
            {group.items.map((key) => (
              <li key={key} className="p-4">
                <ChecklistRow
                  itemKey={key}
                  item={items[key]}
                  onChoose={(r) => choose(key, r)}
                  onNoteChange={(note) => update(key, { note })}
                  onNoteBlur={() => void persist(key)}
                  onOpenNote={() => update(key, { noteOpen: true })}
                  onRetry={() => void persist(key)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <p aria-live="polite" className={`text-center text-sm ${progress.complete ? "text-brand-800" : "text-slate-600"}`}>
          {progress.complete ? (finished ? t.checklist.finished : t.checklist.allDone) : t.checklist.finishHint(progress.total - progress.done)}
        </p>
        <FormError message={finishError} />
        <Button onClick={() => void onFinish()} loading={finishing} disabled={!progress.complete}>
          {finished ? t.checklist.backToCarDone : t.checklist.finish}
        </Button>
      </div>
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
  onRetry,
}: {
  itemKey: ChecklistKey;
  item: Item;
  onChoose: (r: ChecklistResult) => void;
  onNoteChange: (note: string) => void;
  onNoteBlur: () => void;
  onOpenNote: () => void;
  onRetry: () => void;
}) {
  const t = useT();
  const { label, hint } = t.checklist.items[itemKey];
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-slate-500">{hint}</p>
        </div>
        <SaveState state={item.save} onRetry={onRetry} />
      </div>
      <Segmented label={label} options={resultOptions(t)} value={item.result} onChange={onChoose} />
      {item.noteOpen ? (
        <TextAreaField
          label={t.checklist.noteLabel}
          name={`note-${itemKey}`}
          value={item.note}
          onChange={(e) => onNoteChange(e.target.value)}
          onBlur={onNoteBlur}
          placeholder={t.checklist.notePlaceholder}
          maxLength={FINDING_LIMITS.noteChars}
        />
      ) : (
        <button type="button" onClick={onOpenNote} className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-brand-700">
          + {t.checklist.addNote}
        </button>
      )}
    </div>
  );
}

function SaveState({ state, onRetry }: { state: Item["save"]; onRetry: () => void }) {
  const t = useT();
  if (state === "saving") return <span className="shrink-0 text-xs text-slate-500">{t.checklist.saving}</span>;
  if (state === "saved") return <span className="shrink-0 text-xs text-brand-700">✓ {t.checklist.saved}</span>;
  if (state === "error")
    return (
      <button type="button" onClick={onRetry} className="min-h-11 shrink-0 text-right text-xs font-semibold text-red-700">
        {t.checklist.saveFailed}
      </button>
    );
  return null;
}
