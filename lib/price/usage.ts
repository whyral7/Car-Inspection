import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Price searches run for a car in the last 24 hours (first attempts only, retries don't count).
 * Read with the service role: ai_usage isn't readable by users. Callers check the car is theirs first.
 */
export async function priceSearchesUsed(carId: string): Promise<number | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await createAdminClient()
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("car_id", carId)
    .eq("purpose", "price_estimate")
    .eq("attempt", 1)
    .gte("created_at", since);
  return error ? null : (count ?? 0);
}
