import { createHmac, timingSafeEqual } from "node:crypto";

// Razorpay signs with HMAC-SHA256 and sends the digest as lowercase hex.
// https://razorpay.com/docs/webhooks/validate-test/

function hmacHex(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function sameHex(expected: string, received: string) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Checks the X-Razorpay-Signature header against the raw request body (exactly as received, not re-serialised). */
export function verifyWebhookSignature(rawBody: string, signature: string | null | undefined, secret: string) {
  if (!signature || !secret) return false;
  return sameHex(hmacHex(rawBody, secret), signature);
}

/** Only for tests and local tools: the signature Razorpay would send for `rawBody`. */
export function signWebhookBody(rawBody: string, secret: string) {
  return hmacHex(rawBody, secret);
}
