import { describe, expect, it } from "vitest";
import { webhookAction } from "./webhook";

const payment = (over: Record<string, unknown> = {}) => ({
  id: "pay_29QQoUBi66xm2f",
  order_id: "order_9A33XWu170gUtm",
  amount: 99900,
  currency: "INR",
  status: "captured",
  error_description: null,
  ...over,
});
const event = (name: string, entity: Record<string, unknown> | null) => ({
  entity: "event",
  event: name,
  payload: entity ? { payment: { entity }, order: { entity: { id: "order_9A33XWu170gUtm" } } } : {},
});

describe("webhookAction", () => {
  it.each(["order.paid", "payment.captured"])("credits a captured payment on %s", (name) => {
    expect(webhookAction(event(name, payment()))).toEqual({
      kind: "paid",
      event: name,
      orderId: "order_9A33XWu170gUtm",
      paymentId: "pay_29QQoUBi66xm2f",
      amountPaise: 99900,
    });
  });

  it("does not credit a payment that is only authorised", () => {
    expect(webhookAction(event("payment.captured", payment({ status: "authorized" }))).kind).toBe("ignore");
  });

  it("records a failed payment with its reason", () => {
    const action = webhookAction(event("payment.failed", payment({ status: "failed", error_description: "Payment was cancelled by the user" })));
    expect(action).toMatchObject({ kind: "failed", orderId: "order_9A33XWu170gUtm", reason: "Payment was cancelled by the user" });
  });

  it("ignores other events, payments without an order, other currencies and junk", () => {
    expect(webhookAction(event("refund.created", payment())).kind).toBe("ignore");
    expect(webhookAction(event("order.paid", payment({ order_id: null }))).kind).toBe("ignore");
    expect(webhookAction(event("order.paid", payment({ currency: "USD" }))).kind).toBe("ignore");
    expect(webhookAction(event("order.paid", null)).kind).toBe("ignore");
    expect(webhookAction({ hello: "world" }).kind).toBe("ignore");
    expect(webhookAction(null).kind).toBe("ignore");
  });
});
