"use client";

// Autosave for forms people fill in on the spot (car details, profile, damage notes): what they've
// typed is kept on this phone, so a call, a camera switch or a dropped tab doesn't lose it. Best
// effort: if storage is blocked the form simply works without it.
import { useEffect, useRef, type RefObject } from "react";

const PREFIX = "treadmark:draft:";
/** Drafts older than this are ignored and removed. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type Saved = { at: number; values: Record<string, string> };

function read(key: string): Saved | null {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFIX + key) ?? "null") as Saved | null;
    if (!saved || typeof saved.at !== "number" || typeof saved.values !== "object") return null;
    if (Date.now() - saved.at > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

function serialise(form: HTMLFormElement) {
  const values: Record<string, string> = {};
  for (const [name, value] of new FormData(form)) if (typeof value === "string") values[name] = value;
  return values;
}

/**
 * Saves the form's text fields as the user types and puts them back on the next visit. Pass `null`
 * as the key to turn it off. `onRestore` runs once if anything was restored (e.g. to show a toast).
 * Uncontrolled inputs only: restored values are written straight into the fields.
 */
export function useFormDraft(key: string | null, form: RefObject<HTMLFormElement | null>, onRestore?: () => void) {
  const restoreCallback = useRef(onRestore);
  useEffect(() => {
    restoreCallback.current = onRestore;
  });

  useEffect(() => {
    const el = form.current;
    if (!key || !el) return;

    const saved = read(key);
    let restored = false;
    if (saved) {
      for (const [name, value] of Object.entries(saved.values)) {
        const field = el.elements.namedItem(name);
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) continue;
        if (field instanceof HTMLInputElement && (field.type === "file" || field.type === "hidden")) continue;
        if (field.value !== value) {
          field.value = value;
          restored = true;
        }
      }
    }
    if (restored) restoreCallback.current?.();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), values: serialise(el) } satisfies Saved));
        } catch {
          // Storage full or blocked: carry on without a draft.
        }
      }, 300);
    };
    el.addEventListener("input", save);
    el.addEventListener("change", save);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("input", save);
      el.removeEventListener("change", save);
    };
  }, [key, form]);
}
