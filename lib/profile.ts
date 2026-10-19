import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in dealer and their profile row. Cached per request so layouts and pages share one lookup.
 * Redirects to /login if the session is missing or invalid (proxy.ts normally catches this first).
 */
export const getCurrentDealer = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: dealer, error } = await supabase.from("dealers").select("*").eq("id", auth.user.id).maybeSingle();
  if (error) throw error;
  // The signup trigger creates this row; if it's missing the migration hasn't been run.
  if (!dealer) throw new Error("Dealer profile not found. Run the Supabase migration (see README).");

  return { supabase, user: auth.user, dealer };
});

export function isProfileComplete(dealer: { business_name: string | null; owner_name: string | null }) {
  return Boolean(dealer.business_name && dealer.owner_name);
}
