import { describe, expect, it } from "vitest";
import { runWithConcurrency } from "./concurrency";

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("runWithConcurrency", () => {
  it("never runs more than the limit at once, and uses all of it", async () => {
    let running = 0;
    let peak = 0;
    await runWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async (i) => {
      running++;
      peak = Math.max(peak, running);
      await tick(i % 3);
      running--;
    });
    expect(peak).toBe(4);
  });

  it("returns results in input order even when items finish out of order", async () => {
    const results = await runWithConcurrency([30, 10, 20, 0], 2, async (ms) => {
      await tick(ms);
      return ms * 2;
    });
    expect(results).toEqual([60, 20, 40, 0].map((value) => ({ status: "fulfilled", value })));
  });

  it("keeps going when one item fails", async () => {
    const seen: number[] = [];
    const results = await runWithConcurrency([1, 2, 3], 1, async (n) => {
      seen.push(n);
      if (n === 2) throw new Error("boom");
      return n;
    });
    expect(seen).toEqual([1, 2, 3]);
    expect(results[1]).toMatchObject({ status: "rejected", reason: new Error("boom") });
    expect(results[2]).toEqual({ status: "fulfilled", value: 3 });
  });

  it("handles an empty list and rejects a bad limit", async () => {
    await expect(runWithConcurrency([], 4, async () => 1)).resolves.toEqual([]);
    await expect(runWithConcurrency([1], 0, async () => 1)).rejects.toThrow();
  });
});
