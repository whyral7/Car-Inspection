import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export { displayName, isProfileComplete } from "@/lib/user-type";

/**
 * The signed-in user and their profile row. Cached per request so layouts and pages share one lookup.
 * Redirects to /login if the session is missing or invalid (proxy.ts normally catches this first).
 */
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  if (error) throw error;
  // The signup trigger creates this row; if it's missing the migrations haven't been run.
  if (!profile) throw new Error("Profile not found. Run the Supabase migrations (see README).");

  return { supabase, user: auth.user, profile };
});
