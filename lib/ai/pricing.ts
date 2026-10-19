// US$ per million tokens, from Anthropic's price list (October 2026). Used only to estimate
// spend in ai_usage; an unknown model is still logged, just with cost_usd = null.
type Price = { input: number; output: number };

const PRICES: Record<string, Price> = {
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

// Standard prompt-caching multipliers on the input price.
const CACHE_WRITE = 1.25;
const CACHE_READ = 0.1;

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
};

/** Price for a model id, ignoring a dated snapshot suffix like "-20260401". */
export function priceFor(model: string): Price | null {
  return PRICES[model] ?? PRICES[model.replace(/-\d{8}$/, "")] ?? null;
}

/** Estimated cost in US$ for one call, or null if the model isn't in the table. */
export function estimateCostUsd(model: string, usage: TokenUsage): number | null {
  const price = priceFor(model);
  if (!price) return null;
  const inputEquivalent =
    usage.input_tokens + usage.cache_creation_input_tokens * CACHE_WRITE + usage.cache_read_input_tokens * CACHE_READ;
  return (inputEquivalent * price.input + usage.output_tokens * price.output) / 1_000_000;
}
