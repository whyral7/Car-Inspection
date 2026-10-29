/**
 * Runs `worker` over `items` with at most `limit` running at once, starting the next item as soon
 * as one finishes. Resolves when all are done. A worker that throws doesn't stop the others; its
 * error is returned in that item's slot.
 */
export async function runWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  if (!Number.isInteger(limit) || limit < 1) throw new Error(`Concurrency limit must be a positive integer, got ${limit}`);
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function lane() {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}
