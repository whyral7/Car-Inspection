import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AI } from "@/lib/config";
import { serverEnv } from "@/lib/env.server";
import type { AngleKey } from "@/lib/photos/angles";
import { buildRequest, parseAnalysis, type PhotoAnalysis } from "./analysis";
import type { TokenUsage } from "./pricing";

let client: Anthropic | null = null;

function getClient() {
  client ??= new Anthropic({ apiKey: serverEnv("ANTHROPIC_API_KEY"), timeout: AI.requestTimeoutMs, maxRetries: AI.apiRetries });
  return client;
}

/** One model call. Every attempt is logged to ai_usage, including ones whose reply was thrown away. */
export type AttemptRecord = TokenUsage & {
  attempt: number;
  outcome: "ok" | "invalid_json" | "refused" | "api_error";
};

export type AnalyseOutcome =
  | { ok: true; model: string; analysis: PhotoAnalysis; rawText: string; attempts: AttemptRecord[] }
  | { ok: false; model: string; reason: "invalid_json" | "refused" | "api_error"; detail: string; rawText: string | null; attempts: AttemptRecord[] };

const noTokens: TokenUsage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };

function tokens(usage: Anthropic.Usage): TokenUsage {
  return {
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
  };
}

/**
 * Asks Claude for visible damage in one JPEG. If the reply isn't valid JSON in the expected shape
 * it retries once, then gives up. A refusal or an API error (after the SDK's own retries) fails at once.
 */
export async function analysePhoto(angleKey: AngleKey, jpegBase64: string): Promise<AnalyseOutcome> {
  const model = serverEnv("ANTHROPIC_MODEL");
  const attempts: AttemptRecord[] = [];
  let rawText: string | null = null;
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    let response: Anthropic.Message;
    try {
      response = await getClient().messages.create(buildRequest(model, angleKey, jpegBase64));
    } catch (error) {
      attempts.push({ ...noTokens, attempt, outcome: "api_error" });
      const detail = error instanceof Anthropic.APIError ? `${error.status ?? "network"}: ${error.message}` : String(error);
      return { ok: false, model, reason: "api_error", detail, rawText, attempts };
    }

    if (response.stop_reason === "refusal") {
      attempts.push({ ...tokens(response.usage), attempt, outcome: "refused" });
      return { ok: false, model, reason: "refused", detail: response.stop_details?.explanation ?? "Refused", rawText, attempts };
    }

    rawText = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    const parsed = parseAnalysis(rawText, angleKey);
    if (parsed.ok) {
      attempts.push({ ...tokens(response.usage), attempt, outcome: "ok" });
      return { ok: true, model, analysis: parsed.analysis, rawText, attempts };
    }
    attempts.push({ ...tokens(response.usage), attempt, outcome: "invalid_json" });
    lastError = response.stop_reason === "max_tokens" ? "Reply was cut off at max_tokens" : parsed.error;
  }

  return { ok: false, model, reason: "invalid_json", detail: lastError, rawText, attempts };
}
