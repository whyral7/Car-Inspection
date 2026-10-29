import { z } from "zod";
import { CREDIT_PACKS } from "@/lib/config";

export type CreditPack = (typeof CREDIT_PACKS)[number];
export type PackKey = CreditPack["key"];

export const packKeySchema = z.enum(CREDIT_PACKS.map((p) => p.key) as [PackKey, ...PackKey[]]);

export function findPack(key: string): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.key === key) ?? null;
}

/** Price of one report in the pack, to the nearest paisa. */
export function pricePerReportPaise(pack: CreditPack) {
  return Math.round(pack.pricePaise / pack.credits);
}
