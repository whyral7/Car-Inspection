import type { UserType } from "@/lib/supabase/database.types";

// Who a user is, picked at signup ("I am a: Car owner / Buying a car / Dealer"). Only dealers have a
// business name, address and logo, and only dealers see those fields.

export const USER_TYPES = ["car_owner", "buyer", "dealer"] as const satisfies readonly UserType[];

type NameFields = { user_type: UserType | null; owner_name: string | null; business_name: string | null };

/** Header, profile and report name: a dealer's business name when they set one, otherwise the person's name. */
export function displayName(profile: NameFields) {
  return (profile.user_type === "dealer" && profile.business_name) || profile.owner_name || "";
}

/** Signup is finished once the user has said who they are and given their name. */
export function isProfileComplete(profile: { user_type: UserType | null; owner_name: string | null }) {
  return Boolean(profile.user_type && profile.owner_name);
}
