import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signWebhookBody, verifyWebhookSignature } from "./signature";

const secret = "test_webhook_secret";
const body = JSON.stringify({ event: "order.paid", payload: { payment: { entity: { id: "pay_1", amount: 99900 } } } });

describe("verifyWebhookSignature", () => {
  it("accepts Razorpay's HMAC-SHA256 hex of the raw body", () => {
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
    expect(signWebhookBody(body, secret)).toBe(sig);
  });

  it("tolerates upper case and surrounding spaces in the header", () => {
    expect(verifyWebhookSignature(body, ` ${signWebhookBody(body, secret).toUpperCase()} `, secret)).toBe(true);
  });

  it("rejects a changed body, wrong secret, missing or malformed signature", () => {
    const sig = signWebhookBody(body, secret);
    expect(verifyWebhookSignature(body.replace("99900", "99901"), sig, secret)).toBe(false);
    expect(verifyWebhookSignature(body, sig, "other_secret")).toBe(false);
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
    expect(verifyWebhookSignature(body, "", secret)).toBe(false);
    expect(verifyWebhookSignature(body, sig.slice(0, 10), secret)).toBe(false);
    expect(verifyWebhookSignature(body, sig, "")).toBe(false);
  });

  it("is sensitive to re-serialising the JSON (must use the raw body)", () => {
    const pretty = JSON.stringify(JSON.parse(body), null, 2);
    expect(verifyWebhookSignature(pretty, signWebhookBody(body, secret), secret)).toBe(false);
  });
});
