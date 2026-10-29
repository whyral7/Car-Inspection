import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { PRICE } from "@/lib/config";
import { serverEnv } from "@/lib/env.server";
import { SUBMIT_TOOL_SCHEMA, submittedEstimateSchema, verifiedComparables, type SubmittedEstimate } from "@/lib/price/estimate";
import type { TokenUsage } from "./pricing";

type BetaMessage = Anthropic.Beta.Messages.BetaMessage;
type BetaMessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type BetaContentBlock = Anthropic.Beta.Messages.BetaContentBlock;

const SUBMIT = "submit_price_estimate";

// Server-side refusal fallback ("default" routing) is available on these models on the Claude API.
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ apiKey: serverEnv("ANTHROPIC_API_KEY"), timeout: PRICE.requestTimeoutMs, maxRetries: 1 });
  return client;
}

export type PriceCar = {
  make: string;
  model: string;
  variant: string | null;
  year: number;
  fuel: string | null;
  transmission: string | null;
  owners: number | null;
  odometerKm: number | null;
  /** First two letters of the number plate, e.g. "MH". */
  stateCode: string | null;
  city: string | null;
};

/** One API request in the research loop, for the usage log. */
export type PriceAttempt = TokenUsage & { attempt: number; outcome: "ok" | "invalid_json" | "refused" | "api_error"; webSearches: number };

export type PriceOutcome =
  | { ok: true; model: string; estimate: SubmittedEstimate; attempts: PriceAttempt[] }
  | { ok: false; model: string; reason: "not_enough_data" | "invalid" | "refused" | "api_error"; detail: string; attempts: PriceAttempt[] };

const SYSTEM = `You estimate fair used-car prices in India from current online listings.

Search for listings and price guides for the same make and model (and the same or closest variant), with the same fuel and transmission, from the model year or one year either side. Look in or near the car's city first, then across India. Good sources include CarDekho, CarWale, Cars24, Spinny, OLX, CarTrade, Droom and Maruti Suzuki True Value. Note each listing's asking price, year and kilometres.

When you have enough, call ${SUBMIT} exactly once:
- market_low_inr and market_high_inr: the range a buyer would fairly pay today for this car in average condition for its age, taking its kilometres and number of owners into account. Listing prices are asking prices, usually a little above what cars sell for; allow for that.
- Do not adjust for this car's own condition; the app does that from its inspection score.
- comparables: the listings or price pages you relied on, with URLs copied exactly from the search results.
- If you found fewer than three relevant listings or prices, set enough_data to false.

Never invent listings, prices or links. Write the summary in plain English for the car's owner, one or two sentences.`;

function describeCar(car: PriceCar) {
  const lines = [
    `Make: ${car.make}`,
    `Model: ${car.model}`,
    car.variant ? `Variant: ${car.variant}` : null,
    `Year: ${car.year}`,
    car.fuel ? `Fuel: ${car.fuel}` : null,
    car.transmission ? `Transmission: ${car.transmission}` : null,
    car.owners ? `Owners so far: ${car.owners}` : null,
    car.odometerKm !== null ? `Odometer: ${car.odometerKm} km` : null,
    car.stateCode ? `Registered in state code: ${car.stateCode}` : null,
    `City: ${car.city ?? "not given"}`,
  ];
  return `Estimate the current market price range for this used car.\n\n${lines.filter(Boolean).join("\n")}`;
}

const noTokens: TokenUsage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };

function usageOf(response: BetaMessage): TokenUsage & { webSearches: number } {
  const u = response.usage;
  return {
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
    cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
    webSearches: u.server_tool_use?.web_search_requests ?? 0,
  };
}

const URL_RE = /https?:\/\/[^\s"'<>\\)\]]+/g;

/** Every URL that came back from the web tools (search results, or code that filtered them). */
function collectUrls(blocks: readonly BetaContentBlock[], into: Set<string>) {
  for (const block of blocks) {
    if (block.type === "tool_use" || block.type === "text" || block.type === "thinking") continue;
    for (const url of JSON.stringify(block).match(URL_RE) ?? []) into.add(url);
  }
}

/**
 * Researches the market price of one car with Claude and live web search. Every API request is
 * returned in `attempts` for the usage log, including failed ones.
 */
export async function estimateMarketPrice(car: PriceCar): Promise<PriceOutcome> {
  const model = serverEnv("ANTHROPIC_MODEL");
  const attempts: PriceAttempt[] = [];
  const seenUrls = new Set<string>();
  const messages: BetaMessageParam[] = [{ role: "user", content: describeCar(car) }];
  let nudged = false;

  const tools: Anthropic.Beta.Messages.BetaToolUnion[] = [
    {
      type: "web_search_20260209",
      name: "web_search",
      max_uses: PRICE.maxSearches,
      user_location: { type: "approximate", country: "IN", ...(car.city ? { city: car.city } : {}) },
    },
    {
      name: SUBMIT,
      description: "Submit the price estimate once you have researched the listings. Call this exactly once.",
      input_schema: SUBMIT_TOOL_SCHEMA as unknown as Anthropic.Beta.Messages.BetaTool.InputSchema,
      strict: true,
    },
  ];
  const fallback = FALLBACK_MODELS.has(model);

  for (let attempt = 1; attempt <= PRICE.maxContinuations + 2; attempt++) {
    let response: BetaMessage;
    try {
      response = await getClient().beta.messages.create({
        model,
        max_tokens: PRICE.maxTokens,
        system: SYSTEM,
        messages,
        tools,
        tool_choice: { type: "auto" },
        output_config: { effort: PRICE.effort },
        ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      });
    } catch (error) {
      attempts.push({ ...noTokens, webSearches: 0, attempt, outcome: "api_error" });
      const detail = error instanceof Anthropic.APIError ? `${error.status ?? "network"}: ${error.message}` : String(error);
      return { ok: false, model, reason: "api_error", detail, attempts };
    }

    const usage = usageOf(response);
    collectUrls(response.content, seenUrls);

    if (response.stop_reason === "refusal") {
      attempts.push({ ...usage, attempt, outcome: "refused" });
      return { ok: false, model, reason: "refused", detail: response.stop_details?.explanation ?? "Refused", attempts };
    }

    const call = response.content.find((b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === "tool_use" && b.name === SUBMIT);
    if (call) {
      const parsed = submittedEstimateSchema.safeParse(call.input);
      if (!parsed.success) {
        attempts.push({ ...usage, attempt, outcome: "invalid_json" });
        return { ok: false, model, reason: "invalid", detail: parsed.error.issues.map((i) => i.message).join("; "), attempts };
      }
      attempts.push({ ...usage, attempt, outcome: "ok" });
      const estimate = { ...parsed.data, comparables: verifiedComparables(parsed.data.comparables, seenUrls) };
      if (!estimate.enough_data) return { ok: false, model, reason: "not_enough_data", detail: estimate.summary, attempts };
      return { ok: true, model, estimate, attempts };
    }

    attempts.push({ ...usage, attempt, outcome: "invalid_json" });
    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason === "pause_turn") continue; // the server-side search loop paused; resume it
    if (nudged || response.stop_reason === "max_tokens") break;
    // Finished without submitting: ask once more, then give up.
    nudged = true;
    messages.push({ role: "user", content: `Please call ${SUBMIT} now with what you found.` });
  }

  return { ok: false, model, reason: "invalid", detail: "No estimate was submitted", attempts };
}
