import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO, STORAGE_BUCKETS } from "@/lib/config";
import type { Database } from "@/lib/supabase/database.types";
import { photoPath, type AngleKey } from "./angles";

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Network drops, timeouts and 5xx/408/429 are worth retrying. A 4xx (not signed in, a policy
 * rejection, a file the bucket refuses) or a Postgres error code will fail the same way again.
 */
export function isRetryable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return true;
  const e = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  const status = Number(e.status ?? e.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 500) return status === 408 || status === 429;
  // PostgREST/Postgres errors carry a code ("42501", "23505", "PGRST301"); fetch failures do not.
  if (typeof e.code === "string" && e.code !== "") return false;
  return true;
}

type RetryOptions = {
  /** Extra attempts after the first one. */
  retries: number;
  baseDelayMs: number;
  /** Called before waiting to retry; `attempt` is 1 for the first retry. */
  onRetry?: (attempt: number, error: unknown) => void;
  shouldRetry?: (error: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Runs `fn`, retrying with exponential backoff (base, 2x base, 4x base, …). Rethrows the last error. */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { retries, baseDelayMs, onRetry, shouldRetry = isRetryable, sleep = defaultSleep } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error)) throw error;
      onRetry?.(attempt + 1, error);
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
}

/**
 * Stores one compressed photo at cars/{car_id}/{angle_key}.jpg and upserts its inspection_photos row.
 * Safe to repeat: the same path is overwritten and a retake resets the AI state for the new picture.
 * The file is uploaded once; if only the row write fails, a retry skips the upload.
 */
export async function uploadAnglePhoto(
  supabase: SupabaseClient<Database>,
  carId: string,
  angleKey: AngleKey,
  blob: Blob,
  onRetry?: (attempt: number) => void,
) {
  const path = photoPath(carId, angleKey);
  let stored = false;

  await withRetry(
    async () => {
      if (!stored) {
        const { error } = await withTimeout(
          supabase.storage.from(STORAGE_BUCKETS.inspectionPhotos).upload(path, blob, { contentType: "image/jpeg", upsert: true }),
          PHOTO.uploadTimeoutMs,
        );
        if (error) throw error;
        stored = true;
      }
      const { error } = await withTimeout(
        supabase
          .from("inspection_photos")
          .upsert({ car_id: carId, angle_key: angleKey, storage_path: path, ai_status: "pending", ai_findings: null }, { onConflict: "car_id,angle_key" }),
        PHOTO.uploadTimeoutMs,
      );
      if (error) throw error;
    },
    { retries: PHOTO.uploadRetries, baseDelayMs: PHOTO.retryBaseDelayMs, onRetry: (attempt) => onRetry?.(attempt) },
  );

  return path;
}
