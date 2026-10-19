import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env.server";

// Razorpay REST API over fetch (no SDK needed for one call). Keys stay on the server.
// https://razorpay.com/docs/api/orders/create/

const API = "https://api.razorpay.com/v1";
const TIMEOUT_MS = 15_000;

const orderSchema = z.object({
  id: z.string().startsWith("order_"),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
});

export type RazorpayOrder = z.infer<typeof orderSchema>;

export class RazorpayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "RazorpayError";
  }
}

function authHeader() {
  const token = Buffer.from(`${serverEnv("RAZORPAY_KEY_ID")}:${serverEnv("RAZORPAY_KEY_SECRET")}`).toString("base64");
  return `Basic ${token}`;
}

/** Creates an INR order. `receipt` is ours (max 40 chars); `notes` show up in the Razorpay dashboard. */
export async function createOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }): Promise<RazorpayOrder> {
  let res: Response;
  try {
    res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ amount: input.amountPaise, currency: "INR", receipt: input.receipt.slice(0, 40), notes: input.notes }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    throw new RazorpayError(`Could not reach Razorpay: ${err instanceof Error ? err.message : String(err)}`);
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const description = (body as { error?: { description?: string } } | null)?.error?.description ?? res.statusText;
    throw new RazorpayError(`Razorpay order failed (${res.status}): ${description}`, res.status);
  }
  const order = orderSchema.safeParse(body);
  if (!order.success) throw new RazorpayError("Unexpected order response from Razorpay");
  return order.data;
}
