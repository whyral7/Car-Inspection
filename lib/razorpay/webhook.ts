import { z } from "zod";

// The parts of a Razorpay webhook we use. Everything else in the payload is ignored.
// https://razorpay.com/docs/webhooks/payloads/payments/

const paymentEntity = z.object({
  id: z.string().min(1),
  order_id: z.string().min(1).nullable().optional(),
  amount: z.number().int().nonnegative(),
  currency: z.string().optional(),
  status: z.string(),
  error_description: z.string().nullable().optional(),
});

const webhookSchema = z.object({
  event: z.string(),
  payload: z
    .object({
      payment: z.object({ entity: paymentEntity }).optional(),
    })
    .optional(),
});

export type WebhookAction =
  | { kind: "paid"; event: string; orderId: string; paymentId: string; amountPaise: number }
  | { kind: "failed"; event: string; orderId: string; paymentId: string; reason: string | null }
  | { kind: "ignore"; event: string; reason: string };

/**
 * What to do with a webhook body (already signature-checked).
 * We subscribe to order.paid, payment.captured and payment.failed. order.paid and payment.captured
 * both arrive for one successful payment; the database function makes the second one a no-op.
 */
export function webhookAction(body: unknown): WebhookAction {
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) return { kind: "ignore", event: "unknown", reason: "unrecognised payload" };

  const { event, payload } = parsed.data;
  const payment = payload?.payment?.entity;
  if (!payment) return { kind: "ignore", event, reason: "no payment in payload" };
  if (!payment.order_id) return { kind: "ignore", event, reason: "payment without an order" };
  if (payment.currency && payment.currency !== "INR") return { kind: "ignore", event, reason: `currency ${payment.currency}` };

  if (event === "order.paid" || event === "payment.captured") {
    // Only captured money counts. An authorised-but-not-captured payment can still be refunded automatically.
    if (payment.status !== "captured") return { kind: "ignore", event, reason: `payment status ${payment.status}` };
    return { kind: "paid", event, orderId: payment.order_id, paymentId: payment.id, amountPaise: payment.amount };
  }

  if (event === "payment.failed") {
    return { kind: "failed", event, orderId: payment.order_id, paymentId: payment.id, reason: payment.error_description ?? null };
  }

  return { kind: "ignore", event, reason: "event not handled" };
}
