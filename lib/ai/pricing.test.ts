import { describe, expect, it } from "vitest";
import { estimateCostUsd, priceFor } from "./pricing";

const usage = (input: number, output: number, cacheWrite = 0, cacheRead = 0) => ({
  input_tokens: input,
  output_tokens: output,
  cache_creation_input_tokens: cacheWrite,
  cache_read_input_tokens: cacheRead,
});

describe("estimateCostUsd", () => {
  it("prices input and output per million tokens", () => {
    // Opus 5.5: $4 in, $20 out.
    expect(estimateCostUsd("claude-opus-5-5", usage(1_000_000, 0))).toBeCloseTo(4);
    expect(estimateCostUsd("claude-opus-5-5", usage(2000, 500))).toBeCloseTo(0.018);
  });

  it("applies cache write and read multipliers", () => {
    expect(estimateCostUsd("claude-sonnet-5-5", usage(0, 0, 1_000_000, 1_000_000))).toBeCloseTo(2 * 1.25 + 2 * 0.1);
  });

  it("matches dated snapshots and returns null for unknown models", () => {
    expect(priceFor("claude-haiku-4-5-20251001")).toEqual({ input: 1, output: 5 });
    expect(estimateCostUsd("some-other-model", usage(1000, 1000))).toBeNull();
  });
});
