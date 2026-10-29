"use server";

import { z } from "zod";
import { APP_NAME } from "@/lib/config";
import { findPack, packKeySchema } from "@/lib/credits/packs";
import { serverEnv } from "@/lib/env.server";
import { getCurrentProfile } from "@/lib/profile";
import { createOrder } from "@/lib/razorpay/api";
import { getT } from "@/lib/i18n.server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Open orders a dealer may start in an hour, so a stuck button can't flood Razorpay. */
const MAX_ORDERS_PER_HOUR = 20;

export type OrderResult =
  | {
      ok: true;
      keyId: string;
      orderId: string;
      amountPaise: number;
      credits: number;
      name: string;
      description: string;
      prefill: { name: string; contact: string };
    }
  | { ok: false; error: string };

export type OrderStatus = { status: "created" | "paid" | "failed" | "unknown"; credits: number; creditsAdded: number; failureReason: string | null };

/**
 * Starts a purchase: creates a Razorpay order for the pack and records it as 'created'. The browser
 * then opens Razorpay Checkout with the order id. Credits are added later by the webhook, never here.
 */
export async function createCreditOrder(packKey: string): Promise<OrderResult> {
  const t = await getT();
  const key = packKeySchema.safeParse(packKey);
  const pack = key.success ? findPack(key.data) : null;
  if (!pack) return { ok: false, error: t.common.somethingWrong };

  const { profile } = await getCurrentProfile();
  const admin = createAdminClient();

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("dealer_id", profile.id)
    .gte("created_at", since);
  if (countError) return { ok: false, error: t.credits.errors.server };
  if ((count ?? 0) >= MAX_ORDERS_PER_HOUR) return { ok: false, error: t.credits.errors.tooMany };

  let orderId: string;
  try {
    const order = await createOrder({
      amountPaise: pack.pricePaise,
      receipt: `tm_${Date.now().toString(36)}_${profile.id.slice(0, 8)}`,
      notes: { dealer_id: profile.id, pack_key: pack.key, credits: String(pack.credits) },
    });
    orderId = order.id;
  } catch (error) {
    console.error(`[razorpay] dealer=${profile.id} order for ${pack.key} failed`, error);
    return { ok: false, error: t.credits.errors.server };
  }

  const { error } = await admin.from("payments").insert({
    dealer_id: profile.id,
    razorpay_order_id: orderId,
    amount_paise: pack.pricePaise,
    credits: pack.credits,
    pack_key: pack.key,
    status: "created",
  });
  if (error) {
    console.error(`[razorpay] dealer=${profile.id} order=${orderId} could not be saved`, error);
    return { ok: false, error: t.credits.errors.server };
  }

  return {
    ok: true,
    keyId: serverEnv("RAZORPAY_KEY_ID"),
    orderId,
    amountPaise: pack.pricePaise,
    credits: pack.credits,
    name: APP_NAME,
    description: t.credits.checkoutDescription(pack.credits),
    prefill: { name: profile.owner_name ?? "", contact: profile.phone ? `+${profile.phone.replace(/^\+/, "")}` : "" },
  };
}

/** The dealer's own order and current balance, read with RLS. Polled after Checkout closes. */
export async function getOrderStatus(orderId: string): Promise<OrderStatus> {
  // getCurrentProfile reads the profile row fresh on every request, so `credits` is the live balance.
  const { supabase, profile } = await getCurrentProfile();
  const credits = profile.credits;
  if (!z.string().regex(/^order_[A-Za-z0-9]+$/).safeParse(orderId).success) {
    return { status: "unknown", credits, creditsAdded: 0, failureReason: null };
  }
  const payment = await supabase.from("payments").select("status, credits, failure_reason").eq("razorpay_order_id", orderId).maybeSingle();
  if (payment.error || !payment.data) return { status: "unknown", credits, creditsAdded: 0, failureReason: null };
  return {
    status: payment.data.status,
    credits,
    creditsAdded: payment.data.status === "paid" ? payment.data.credits : 0,
    failureReason: payment.data.failure_reason,
  };
}
