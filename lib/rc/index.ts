import "server-only";
import { z } from "zod";
import { createMockProvider } from "./mock";
import { createSurepassProvider } from "./surepass";
import type { RcLookupResult, RcProvider } from "./types";

export type { RcDetails, RcLookupResult, RcProvider } from "./types";

const rcEnv = z.object({
  RC_PROVIDER: z.enum(["mock", "surepass", "other"]).optional().catch(undefined),
  RC_API_KEY: z.string().trim().min(1).optional().catch(undefined),
});

/**
 * The provider picked by RC_PROVIDER, or null when lookups are off (unset, unknown, or no key).
 * To add a provider: implement RcProvider in lib/rc/<name>.ts and add a case here.
 */
export function getRcProvider(env: Record<string, string | undefined> = process.env): RcProvider | null {
  const { RC_PROVIDER, RC_API_KEY } = rcEnv.parse({
    RC_PROVIDER: env.RC_PROVIDER || undefined,
    RC_API_KEY: env.RC_API_KEY || undefined,
  });
  switch (RC_PROVIDER) {
    case "mock":
      return createMockProvider();
    case "surepass":
      return RC_API_KEY ? createSurepassProvider(RC_API_KEY) : null;
    default:
      // "other" is reserved for a future provider.
      return null;
  }
}

/** Never throws: any problem becomes "unavailable" so the dealer can type the details in. */
export async function lookupRc(regNumber: string): Promise<RcLookupResult> {
  const provider = getRcProvider();
  if (!provider) return { status: "unavailable" };
  try {
    const details = await provider.lookup(regNumber);
    return details ? { status: "found", provider: provider.name, details } : { status: "not_found" };
  } catch (error) {
    console.error(`RC lookup via ${provider.name} failed`, error);
    return { status: "unavailable" };
  }
}
