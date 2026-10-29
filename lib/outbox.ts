// Browser-only. Work that hasn't reached the server yet, kept in IndexedDB so it survives a dropped
// signal, a closed tab or Android killing the browser while the camera app is open. Each screen
// writes here first, uploads, and deletes the entry once the server has it; on the next visit (or
// when the connection comes back) whatever is left is sent again.
//
// Two stores:
// - photos:    one compressed photo (and its small report copy) per car and angle.
// - checklist: the latest answer per car and checklist item.

import type { AngleKey } from "@/lib/photos/angles";
import type { ChecklistResult } from "@/lib/supabase/database.types";

const DB_NAME = "treadmark";
const DB_VERSION = 1;
const PHOTOS = "photos";
const CHECKLIST = "checklist";

export type OutboxPhoto = { carId: string; angleKey: AngleKey; blob: Blob; small: Blob | null; savedAt: number };
export type OutboxAnswer = { carId: string; itemKey: string; result: ChecklistResult; note: string | null; savedAt: number };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB not available"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS, { keyPath: ["carId", "angleKey"] }).createIndex("carId", "carId");
      if (!db.objectStoreNames.contains(CHECKLIST)) db.createObjectStore(CHECKLIST, { keyPath: ["carId", "itemKey"] }).createIndex("carId", "carId");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  // A failed open (private mode, storage full) shouldn't stick: let the next call try again.
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = work(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

/**
 * Storage can be unavailable (private browsing, full disk). The outbox is a safety net, so every call
 * degrades to "nothing saved" instead of throwing into the UI.
 */
async function safe<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    console.warn("Outbox unavailable:", error);
    return fallback;
  }
}

export const photoOutbox = {
  put: (entry: Omit<OutboxPhoto, "savedAt">) => safe(() => run(PHOTOS, "readwrite", (s) => s.put({ ...entry, savedAt: Date.now() })).then(() => true), false),
  remove: (carId: string, angleKey: AngleKey) => safe(() => run(PHOTOS, "readwrite", (s) => s.delete([carId, angleKey])).then(() => undefined), undefined),
  list: (carId: string) => safe(() => run<OutboxPhoto[]>(PHOTOS, "readonly", (s) => s.index("carId").getAll(carId)), [] as OutboxPhoto[]),
};

export const checklistOutbox = {
  put: (entry: Omit<OutboxAnswer, "savedAt">) => safe(() => run(CHECKLIST, "readwrite", (s) => s.put({ ...entry, savedAt: Date.now() })).then(() => true), false),
  remove: (carId: string, itemKey: string) => safe(() => run(CHECKLIST, "readwrite", (s) => s.delete([carId, itemKey])).then(() => undefined), undefined),
  list: (carId: string) => safe(() => run<OutboxAnswer[]>(CHECKLIST, "readonly", (s) => s.index("carId").getAll(carId)), [] as OutboxAnswer[]),
};
