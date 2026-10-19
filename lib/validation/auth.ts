import { z } from "zod";
import { t } from "@/lib/strings";

/**
 * Accepts what a dealer might type or paste ("98765 43210", "+91 98765-43210", "098765...")
 * and returns E.164 (+91XXXXXXXXXX). Indian mobiles start with 6-9.
 */
export const indianMobileSchema = z
  .string()
  .transform((raw) => {
    let digits = raw.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    return digits;
  })
  .pipe(z.string().regex(/^[6-9]\d{9}$/, t.login.errors.invalidPhone))
  .transform((digits) => `+91${digits}`);

export const otpSchema = z
  .string()
  .transform((s) => s.replace(/\D/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, t.login.errors.invalidOtp));

/** Only allow same-site relative paths after login, to avoid open redirects. */
export function safeNextPath(next: string | null | undefined, fallback = "/app"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
