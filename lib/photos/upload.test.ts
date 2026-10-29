import { describe, expect, it, vi } from "vitest";
import { isRetryable, withRetry } from "./upload";

const noSleep = () => Promise.resolve();

describe("withRetry", () => {
  it("returns the result without retrying when the first attempt works", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 1000, sleep: noSleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a dropped connection and then succeeds", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue("ok");
    const onRetry = vi.fn();
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 1000, sleep: noSleep, onRetry })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry.mock.calls.map(([attempt]) => attempt)).toEqual([1, 2]);
  });

  it("makes 1 attempt plus 3 retries, then throws the last error", async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 1000, sleep: noSleep })).rejects.toThrow("Failed to fetch");
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("backs off exponentially", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValue(new Error("down"));
    await withRetry(fn, { retries: 3, baseDelayMs: 1000, sleep }).catch(() => {});
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000, 4000]);
  });

  it("does not retry errors that would fail the same way again", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 403, message: "new row violates row-level security policy" });
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 1000, sleep: noSleep })).rejects.toMatchObject({ status: 403 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("isRetryable", () => {
  it("retries network failures, timeouts and server errors", () => {
    expect(isRetryable(new TypeError("Failed to fetch"))).toBe(true);
    expect(isRetryable({ name: "TimeoutError", message: "Timed out" })).toBe(true);
    expect(isRetryable({ status: 500 })).toBe(true);
    expect(isRetryable({ statusCode: "503" })).toBe(true);
    expect(isRetryable({ status: 408 })).toBe(true);
    expect(isRetryable({ status: 429 })).toBe(true);
  });

  it("does not retry client errors or database errors", () => {
    expect(isRetryable({ status: 400 })).toBe(false);
    expect(isRetryable({ statusCode: "401" })).toBe(false);
    expect(isRetryable({ status: 413 })).toBe(false);
    expect(isRetryable({ code: "42501", message: "permission denied" })).toBe(false);
    expect(isRetryable({ code: "PGRST301" })).toBe(false);
  });

  it("treats a PostgREST fetch failure (empty code) as retryable", () => {
    expect(isRetryable({ code: "", message: "TypeError: Failed to fetch" })).toBe(true);
  });
});
