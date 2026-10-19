import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { verifyWebhookSignature } from "@/lib/razorpay/signature";
import { webhookAction } from "@/lib/razorpay/webhook";
import { createAdminClient } from "@/lib/supabase/admin";

// Razorpay webhook: the only place credits are added. Set this URL in the Razorpay dashboard
// (Settings > Webhooks) with the events order.paid, payment.captured and payment.failed.
//
// Any 2xx tells Razorpay we're done. We answer 500 only for errors worth a retry (database down);
// a bad signature gets 400 and anything we deliberately skip gets 200.

const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status });

export async function POST(request: NextRequest) {
  // The signature covers the exact bytes Razorpay sent, so read the raw body before parsing.
  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, request.headers.get("x-razorpay-signature"), serverEnv("RAZORPAY_WEBHOOK_SECRET"))) {
    console.warn("[razorpay] webhook with a bad signature rejected");
    return json(400, { ok: false, error: "invalid signature" });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json(400, { ok: false, error: "invalid JSON" });
  }

  const action = webhookAction(body);
  const eventId = request.headers.get("x-razorpay-event-id") ?? "-";
  const admin = createAdminClient();

  if (action.kind === "ignore") {
    return json(200, { ok: true, ignored: action.reason });
  }

  if (action.kind === "failed") {
    // Only an open order becomes failed; a later successful retry on the same order still credits.
    const { error } = await admin
      .from("payments")
      .update({ status: "failed", failure_reason: action.reason?.slice(0, 500) ?? null })
      .eq("razorpay_order_id", action.orderId)
      .eq("status", "created");
    if (error) {
      console.error(`[razorpay] event=${eventId} order=${action.orderId} could not mark failed`, error);
      return json(500, { ok: false });
    }
    console.info(`[razorpay] event=${eventId} order=${action.orderId} payment=${action.paymentId} failed: ${action.reason ?? "no reason"}`);
    return json(200, { ok: true, status: "failed" });
  }

  const { data, error } = await admin.rpc("apply_razorpay_payment", {
    p_order_id: action.orderId,
    p_payment_id: action.paymentId,
    p_amount_paise: action.amountPaise,
  });

  if (error) {
    if (error.message === "order_not_found") {
      // Another app on the same Razorpay account, or an order from a different environment.
      console.warn(`[razorpay] event=${eventId} order=${action.orderId} is not ours, ignored`);
      return json(200, { ok: true, ignored: "unknown order" });
    }
    if (error.message === "amount_mismatch") {
      console.error(`[razorpay] event=${eventId} order=${action.orderId} payment=${action.paymentId} amount ${action.amountPaise} does not match the order; NOT credited`);
      return json(200, { ok: true, ignored: "amount mismatch" });
    }
    console.error(`[razorpay] event=${eventId} order=${action.orderId} payment=${action.paymentId} failed to apply`, error);
    return json(500, { ok: false });
  }

  console.info(
    `[razorpay] event=${eventId} ${action.event} order=${action.orderId} payment=${action.paymentId} dealer=${data.dealer_id} -> ${data.status}` +
      (data.status === "credited" ? ` +${data.credits_added} (now ${data.credits})` : ""),
  );
  return json(200, { ok: true, status: data.status });
}
