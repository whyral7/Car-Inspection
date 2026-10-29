// Market price estimate: the shape Claude submits, its validation, and the condition adjustment.
// Pure functions, so the maths is unit-tested and the same on the page, preview and PDF.
import { z } from "zod";
import { PRICE } from "@/lib/config";

/** JSON schema for the submit_price_estimate tool (strict tool use: every field required, no extras). */
export const SUBMIT_TOOL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["enough_data", "market_low_inr", "market_high_inr", "summary", "comparables"],
  properties: {
    enough_data: {
      type: "boolean",
      description: "false if the searches did not find enough comparable listings to give an honest range.",
    },
    market_low_inr: { type: "integer", description: "Low end of the fair market price in rupees for this car in average condition. 0 if enough_data is false." },
    market_high_inr: { type: "integer", description: "High end of the fair market price in rupees for this car in average condition. 0 if enough_data is false." },
    summary: { type: "string", description: "One or two plain sentences on what the listings showed, for the car's owner. No marketing language." },
    comparables: {
      type: "array",
      description: "The listings or price pages the range is based on, copied from the search results. Up to 5.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url", "price_inr", "year", "km"],
        properties: {
          title: { type: "string" },
          url: { type: "string", description: "Exact URL from a search result." },
          price_inr: { type: ["integer", "null"], description: "Asking or quoted price in rupees, if shown." },
          year: { type: ["integer", "null"] },
          km: { type: ["integer", "null"] },
        },
      },
    },
  },
} as const;

const httpUrl = z.url({ protocol: /^https?$/ });

export const comparablesSchema = z
  .array(
    z.object({
      title: z.string().trim().min(1).max(200),
      url: httpUrl,
      price_inr: z.number().int().positive().nullable(),
      year: z.number().int().min(1980).max(2100).nullable(),
      km: z.number().int().nonnegative().nullable(),
    }),
  )
  .max(10);

export const submittedEstimateSchema = z
  .object({
    enough_data: z.boolean(),
    market_low_inr: z.number().int().nonnegative(),
    market_high_inr: z.number().int().nonnegative(),
    summary: z.string().trim().max(600),
    comparables: comparablesSchema,
  })
  .refine((e) => !e.enough_data || (e.market_low_inr >= 10_000 && e.market_high_inr >= e.market_low_inr), "Implausible range")
  // A range wider than 2x is a guess, not an estimate.
  .refine((e) => !e.enough_data || e.market_high_inr <= e.market_low_inr * 2, "Range too wide");

export type SubmittedEstimate = z.infer<typeof submittedEstimateSchema>;
export type Comparable = SubmittedEstimate["comparables"][number];

/** Keeps only comparables whose URL really appeared in the search results, so links are never invented. */
export function verifiedComparables(comparables: readonly Comparable[], seenUrls: ReadonlySet<string>): Comparable[] {
  const norm = (u: string) => u.replace(/#.*$/, "").replace(/\/+$/, "");
  const seen = new Set([...seenUrls].map(norm));
  const out: Comparable[] = [];
  for (const c of comparables) {
    if (seen.has(norm(c.url)) && !out.some((o) => norm(o.url) === norm(c.url))) out.push(c);
  }
  return out.slice(0, PRICE.maxComparables);
}

/** Multiplier for the car's condition score (1.0 at the reference score). */
export function conditionFactor(score: number) {
  const raw = 1 + (score - PRICE.referenceScore) * PRICE.perPoint;
  return Math.min(PRICE.maxFactor, Math.max(PRICE.minFactor, raw));
}

/** Rounds to a sensible step for the price: ₹5,000 under ₹10 lakh, ₹10,000 under ₹50 lakh, else ₹50,000. */
export function roundPrice(rupees: number) {
  const step = rupees < 1_000_000 ? 5_000 : rupees < 5_000_000 ? 10_000 : 50_000;
  return Math.max(step, Math.round(rupees / step) * step);
}

/** The market range adjusted for condition, in rupees. */
export function adjustedRange(marketLow: number, marketHigh: number, score: number) {
  const f = conditionFactor(score);
  const low = roundPrice(marketLow * f);
  const high = Math.max(low, roundPrice(marketHigh * f));
  return { low, high, factor: f };
}
