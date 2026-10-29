"use server";

import { after } from "next/server";
import { z } from "zod";
import { estimateMarketPrice, type PriceOutcome } from "@/lib/ai/price";
import { estimateCostUsd, webSearchCostUsd } from "@/lib/ai/pricing";
import { isFuel, isTransmission } from "@/lib/cars";
import { PRICE } from "@/lib/config";
import { getCurrentProfile } from "@/lib/profile";
import { ensureReportPdf } from "@/lib/report/pdf-store";
import { generateSlug } from "@/lib/report/slug";
import { hiddenSectionsSchema } from "@/lib/report/view";
import { conditionScore } from "@/lib/score";
import { getT } from "@/lib/i18n.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appBaseUrl } from "@/lib/url";

export type PublishResult =
  | { ok: true; slug: string; charged: boolean; credits: number }
  | { ok: false; error: string; code?: "no_credits" | "not_ready" };

export type SectionsResult = { ok: true } | { ok: false; error: string };

/** Builds the PDF after the response is sent, so it's ready by the time anyone taps Download. */
async function prebuildPdf(carId: string) {
  const baseUrl = await appBaseUrl();
  after(() => ensureReportPdf(carId, baseUrl).catch((error: unknown) => console.error(`[report] car=${carId} PDF build failed`, error)));
}

/**
 * Publishes the car's report. The first publish costs 1 credit; publishing again is free and keeps
 * the same link. The score is worked out here from the dealer's own rows (RLS), then the credit, the
 * report row and the car status change together in publish_report (service role only).
 */
export async function publishReport(carId: string, hiddenSections: string[]): Promise<PublishResult> {
  const t = await getT();
  if (!z.uuid().safeParse(carId).success) return { ok: false, error: t.common.somethingWrong };
  const hidden = hiddenSectionsSchema.safeParse(hiddenSections);
  if (!hidden.success) return { ok: false, error: t.common.somethingWrong };

  const { supabase, profile } = await getCurrentProfile();
  const [carRes, findingsRes, checklistRes] = await Promise.all([
    supabase.from("cars").select("id, status").eq("id", carId).maybeSingle(),
    supabase.from("findings").select("severity, accepted").eq("car_id", carId),
    supabase.from("checklist_items").select("result").eq("car_id", carId),
  ]);
  if (carRes.error || findingsRes.error || checklistRes.error) return { ok: false, error: t.report.errors.publish };
  if (!carRes.data) return { ok: false, error: t.common.somethingWrong };
  if (carRes.data.status === "draft") return { ok: false, error: t.report.errors.notReady, code: "not_ready" };

  const score = conditionScore({ findings: findingsRes.data, checklist: checklistRes.data });
  const admin = createAdminClient();

  // A new slug can collide with an existing one (about 1 in 10^15). Try another.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await admin.rpc("publish_report", {
      p_dealer_id: profile.id,
      p_car_id: carId,
      p_slug: generateSlug(),
      p_score: score,
      p_hidden_sections: hidden.data,
    });
    if (!error) {
      await prebuildPdf(carId);
      return { ok: true, ...data };
    }
    if (error.code === "23505" && error.message.includes("slug")) continue;
    if (error.message === "no_credits") return { ok: false, error: t.report.errors.noCredits, code: "no_credits" };
    if (error.message === "not_ready") return { ok: false, error: t.report.errors.notReady, code: "not_ready" };
    console.error(`[report] car=${carId} publish failed`, error);
    return { ok: false, error: t.report.errors.publish };
  }
  return { ok: false, error: t.report.errors.publish };
}

/** Shows or hides sections on an already published report. Free, and buyers see it at once. */
export async function saveHiddenSections(carId: string, hiddenSections: string[]): Promise<SectionsResult> {
  const t = await getT();
  if (!z.uuid().safeParse(carId).success) return { ok: false, error: t.common.somethingWrong };
  const hidden = hiddenSectionsSchema.safeParse(hiddenSections);
  if (!hidden.success) return { ok: false, error: t.common.somethingWrong };

  const { supabase } = await getCurrentProfile();
  // RLS and the column grant let a dealer change only hidden_sections on their own reports.
  const { data, error } = await supabase.from("reports").update({ hidden_sections: hidden.data }).eq("car_id", carId).select("car_id");
  if (error || data.length === 0) return { ok: false, error: t.report.errors.sections };

  await prebuildPdf(carId);
  return { ok: true };
}

export type PriceResult = { ok: true } | { ok: false; error: string; code?: "needs_details" | "limit" | "not_enough_data" };

/**
 * Researches the car's market price with Claude and live web search (20-60 s), then stores the range
 * for a car in average condition. The report adjusts it for the condition score when shown. Free for
 * the user, capped at PRICE.maxPerCarPerDay per car.
 */
export async function estimatePrice(carId: string): Promise<PriceResult> {
  const t = await getT();
  if (!z.uuid().safeParse(carId).success) return { ok: false, error: t.common.somethingWrong };

  const { supabase, profile } = await getCurrentProfile();
  // Read as the user, so RLS limits it to their own car.
  const { data: car, error: carError } = await supabase
    .from("cars")
    .select("id, reg_number, make, model, variant, year, fuel, transmission, owners, odometer_km")
    .eq("id", carId)
    .maybeSingle();
  if (carError) return { ok: false, error: t.report.price.errors.failed };
  if (!car) return { ok: false, error: t.common.somethingWrong };
  if (!car.make || !car.model || !car.year) return { ok: false, error: t.report.price.errors.needsDetails, code: "needs_details" };

  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("car_id", carId)
    .eq("purpose", "price_estimate")
    .eq("attempt", 1)
    .gte("created_at", since);
  if (countError) return { ok: false, error: t.report.price.errors.failed };
  if ((count ?? 0) >= PRICE.maxPerCarPerDay) return { ok: false, error: t.report.price.errors.limit(PRICE.maxPerCarPerDay), code: "limit" };

  const outcome = await estimateMarketPrice({
    make: car.make,
    model: car.model,
    variant: car.variant,
    year: car.year,
    fuel: car.fuel ? (isFuel(car.fuel) ? t.cars.fuels[car.fuel] : car.fuel) : null,
    transmission: car.transmission ? (isTransmission(car.transmission) ? t.cars.transmissions[car.transmission] : car.transmission) : null,
    owners: car.owners,
    odometerKm: car.odometer_km,
    stateCode: /^[A-Z]{2}/.test(car.reg_number) && !/^\d{2}BH/.test(car.reg_number) ? car.reg_number.slice(0, 2) : null,
    city: profile.city,
  });
  await logPriceUsage(admin, profile.id, carId, outcome);

  if (!outcome.ok) {
    if (outcome.reason === "not_enough_data") return { ok: false, error: t.report.price.errors.notEnoughData, code: "not_enough_data" };
    console.error(`[price] car=${carId} estimate failed: ${outcome.reason} ${outcome.detail}`);
    return { ok: false, error: t.report.price.errors.failed };
  }

  const { estimate } = outcome;
  const { error } = await admin.from("price_estimates").upsert({
    car_id: carId,
    market_low_inr: estimate.market_low_inr,
    market_high_inr: estimate.market_high_inr,
    summary: estimate.summary || null,
    comparables: estimate.comparables,
    city: profile.city,
    model: outcome.model,
    searched_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`[price] car=${carId} could not save estimate`, error);
    return { ok: false, error: t.report.price.errors.failed };
  }

  // A published report shows the new estimate at once; refresh its PDF too.
  const { data: report } = await supabase.from("reports").select("published_at").eq("car_id", carId).maybeSingle();
  if (report?.published_at) await prebuildPdf(carId);
  return { ok: true };
}

async function logPriceUsage(admin: ReturnType<typeof createAdminClient>, profileId: string, carId: string, outcome: PriceOutcome) {
  const rows = outcome.attempts.map((a) => ({
    dealer_id: profileId,
    car_id: carId,
    purpose: "price_estimate" as const,
    model: outcome.model,
    attempt: a.attempt,
    outcome: a.outcome,
    input_tokens: a.input_tokens,
    output_tokens: a.output_tokens,
    cache_creation_input_tokens: a.cache_creation_input_tokens,
    cache_read_input_tokens: a.cache_read_input_tokens,
    web_search_requests: a.webSearches,
    cost_usd: (estimateCostUsd(outcome.model, a) ?? 0) + webSearchCostUsd(a.webSearches),
  }));
  const usd = rows.reduce((n, r) => n + r.cost_usd, 0);
  const searches = rows.reduce((n, r) => n + r.web_search_requests, 0);
  console.info(`[price] car=${carId} model=${outcome.model} result=${outcome.ok ? "ok" : outcome.reason} calls=${rows.length} searches=${searches} cost=$${usd.toFixed(4)}`);
  const { error } = await admin.from("ai_usage").insert(rows);
  if (error) console.error("[price] couldn't log usage", error);
}
