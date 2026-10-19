import "server-only";
import { z } from "zod";

/** Server-only secrets. Read lazily so a page that doesn't need a key never fails on it. */
export function serverEnv<K extends keyof typeof serverSchema.shape>(key: K): string {
  const result = serverSchema.shape[key].safeParse(process.env[key]);
  if (!result.success) {
    throw new Error(`Missing environment variable ${key}. Add it to .env.local.`);
  }
  return result.data;
}

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().min(1),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  RC_PROVIDER: z.enum(["mock", "surepass", "other"]),
  RC_API_KEY: z.string().min(1),
});
