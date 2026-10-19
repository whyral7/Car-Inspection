import { NextResponse } from "next/server";
import { z } from "zod";
import { analysePhoto, type AnalyseOutcome } from "@/lib/ai/claude";
import { estimateCostUsd } from "@/lib/ai/pricing";
import { AI, STORAGE_BUCKETS } from "@/lib/config";
import { isAngleKey } from "@/lib/photos/angles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiStatus, FindingRow, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

// Usually 5-15 s. Worst case is two attempts, each with one SDK retry, at 40 s per request.
export const maxDuration = 180;

export type AnalyseResponse = {
  photoId: string;
  status: AiStatus;
  findings: FindingRow[];
  /** Odometer photo only: the reading the model saw, for the dealer to confirm. */
  odometerKm: number | null;
  /** The per-photo daily cap was hit, so nothing was sent to the model. */
  limitReached?: boolean;
};

const error = (status: number, message: string) => NextResponse.json({ error: message }, { status });

/**
 * Analyses one inspection photo with Claude vision, stores the raw output in ai_findings and
 * replaces the photo's AI findings. Photos that are already analysed are returned as they are,
 * so calling this twice is safe. The browser runs up to AI.concurrency of these at once.
 */
export async function POST(_request: Request, ctx: RouteContext<"/api/photos/[photoId]/analyse">) {
  const { photoId } = await ctx.params;
  if (!z.uuid().safeParse(photoId).success) return error(404, "Not found");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return error(401, "Not signed in");

  // RLS limits this to the dealer's own cars, so another dealer's photo is simply not found.
  const { data: photo, error: photoError } = await supabase
    .from("inspection_photos")
    .select("id, car_id, angle_key, storage_path, ai_status, ai_findings, updated_at")
    .eq("id", photoId)
    .maybeSingle();
  if (photoError) return error(500, "Couldn't load photo");
  if (!photo || !isAngleKey(photo.angle_key)) return error(404, "Not found");
  const angleKey = photo.angle_key;

  const respond = async (status: AiStatus, extra: Partial<AnalyseResponse> = {}) => {
    const { data: findings } = await supabase.from("findings").select("*").eq("photo_id", photoId).order("created_at");
    return NextResponse.json<AnalyseResponse>({ photoId, status, findings: findings ?? [], odometerKm: odometerFrom(photo.ai_findings), ...extra });
  };

  if (photo.ai_status === "done" || photo.ai_status === "unclear") return respond(photo.ai_status);

  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCalls } = await admin.from("ai_usage").select("id", { count: "exact", head: true }).eq("photo_id", photoId).gte("created_at", since);
  if ((recentCalls ?? 0) >= AI.maxCallsPerPhotoPerDay) return respond(photo.ai_status, { limitReached: true });

  const { data: blob, error: downloadError } = await supabase.storage.from(STORAGE_BUCKETS.inspectionPhotos).download(photo.storage_path);
  if (downloadError || !blob) return error(502, "Couldn't read photo");
  const jpegBase64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

  let outcome: AnalyseOutcome;
  try {
    outcome = await analysePhoto(angleKey, jpegBase64);
  } catch (e) {
    // Only reached for setup problems such as a missing ANTHROPIC_API_KEY or ANTHROPIC_MODEL.
    console.error("[ai] analysis not attempted", e);
    return error(503, "AI analysis isn't set up");
  }

  await logUsage(admin, { dealerId: auth.user.id, carId: photo.car_id, photoId, angleKey, outcome });

  const analysedAt = new Date().toISOString();
  let status: AiStatus;
  let raw: Json;
  let findings: Json;
  if (outcome.ok) {
    const a = outcome.analysis;
    status = a.unclear ? "unclear" : "done";
    raw = {
      model: outcome.model,
      analysed_at: analysedAt,
      attempts: outcome.attempts.length,
      unclear: a.unclear,
      odometer_km: a.odometerKm,
      findings: a.allFindings,
      min_confidence: AI.minConfidence,
      raw_text: outcome.rawText,
    };
    findings = a.findings.map(({ type, location, severity, note }) => ({ type, location, severity, note }));
  } else {
    status = "failed";
    raw = { model: outcome.model, analysed_at: analysedAt, attempts: outcome.attempts.length, error: outcome.reason, detail: outcome.detail, raw_text: outcome.rawText };
    findings = [];
  }

  const { data: saved, error: saveError } = await supabase.rpc("save_photo_analysis", {
    p_photo_id: photoId,
    p_expected_updated_at: photo.updated_at,
    p_ai_status: status,
    p_ai_findings: raw,
    p_findings: findings,
  });
  if (saveError) {
    console.error("[ai] couldn't save analysis", saveError);
    return error(500, "Couldn't save analysis");
  }
  if (!saved) {
    // Retaken or analysed by another request meanwhile: report whatever is current now.
    const { data: current } = await supabase.from("inspection_photos").select("ai_status, ai_findings").eq("id", photoId).maybeSingle();
    return respond(current?.ai_status ?? "pending", { odometerKm: odometerFrom(current?.ai_findings ?? null) });
  }
  return respond(status, { odometerKm: outcome.ok ? outcome.analysis.odometerKm : null });
}

function odometerFrom(aiFindings: Json | null): number | null {
  if (!aiFindings || typeof aiFindings !== "object" || Array.isArray(aiFindings)) return null;
  const km = aiFindings.odometer_km;
  return typeof km === "number" ? km : null;
}

async function logUsage(
  admin: ReturnType<typeof createAdminClient>,
  { dealerId, carId, photoId, angleKey, outcome }: { dealerId: string; carId: string; photoId: string; angleKey: string; outcome: AnalyseOutcome },
) {
  const rows = outcome.attempts.map((a) => ({
    dealer_id: dealerId,
    car_id: carId,
    photo_id: photoId,
    angle_key: angleKey,
    model: outcome.model,
    attempt: a.attempt,
    outcome: a.outcome,
    input_tokens: a.input_tokens,
    output_tokens: a.output_tokens,
    cache_creation_input_tokens: a.cache_creation_input_tokens,
    cache_read_input_tokens: a.cache_read_input_tokens,
    cost_usd: estimateCostUsd(outcome.model, a),
  }));
  const totals = rows.reduce((s, r) => ({ in: s.in + r.input_tokens, out: s.out + r.output_tokens, usd: s.usd + (r.cost_usd ?? 0) }), { in: 0, out: 0, usd: 0 });
  console.info(
    `[ai] car=${carId} photo=${angleKey} model=${outcome.model} result=${outcome.ok ? "ok" : outcome.reason} calls=${rows.length} in=${totals.in} out=${totals.out} cost=$${totals.usd.toFixed(4)}`,
  );
  // Logging must never break the analysis itself.
  const { error: logError } = await admin.from("ai_usage").insert(rows);
  if (logError) console.error("[ai] couldn't log token usage", logError);
}
