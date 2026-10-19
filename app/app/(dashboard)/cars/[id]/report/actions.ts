"use server";

import { after } from "next/server";
import { z } from "zod";
import { getCurrentDealer } from "@/lib/dealer";
import { ensureReportPdf } from "@/lib/report/pdf-store";
import { generateSlug } from "@/lib/report/slug";
import { hiddenSectionsSchema } from "@/lib/report/view";
import { conditionScore } from "@/lib/score";
import { t } from "@/lib/strings";
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
  if (!z.uuid().safeParse(carId).success) return { ok: false, error: t.common.somethingWrong };
  const hidden = hiddenSectionsSchema.safeParse(hiddenSections);
  if (!hidden.success) return { ok: false, error: t.common.somethingWrong };

  const { supabase, dealer } = await getCurrentDealer();
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
      p_dealer_id: dealer.id,
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
  if (!z.uuid().safeParse(carId).success) return { ok: false, error: t.common.somethingWrong };
  const hidden = hiddenSectionsSchema.safeParse(hiddenSections);
  if (!hidden.success) return { ok: false, error: t.common.somethingWrong };

  const { supabase } = await getCurrentDealer();
  // RLS and the column grant let a dealer change only hidden_sections on their own reports.
  const { data, error } = await supabase.from("reports").update({ hidden_sections: hidden.data }).eq("car_id", carId).select("car_id");
  if (error || data.length === 0) return { ok: false, error: t.report.errors.sections };

  await prebuildPdf(carId);
  return { ok: true };
}
