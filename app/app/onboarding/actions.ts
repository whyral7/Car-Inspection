"use server";

import { redirect } from "next/navigation";
import { STORAGE_BUCKETS } from "@/lib/config";
import { getCurrentProfile, isProfileComplete } from "@/lib/profile";
import { t } from "@/lib/strings";
import { onboardingSchema, type OnboardingField } from "@/lib/validation/profile";

export type OnboardingState = {
  fieldErrors?: Partial<Record<OnboardingField, string>>;
  formError?: string;
};

export async function saveProfile(formData: FormData): Promise<OnboardingState> {
  const { supabase, user, profile } = await getCurrentProfile();

  const parsed = onboardingSchema(user.id).safeParse({
    user_type: formData.get("user_type") ?? "",
    owner_name: formData.get("owner_name") ?? "",
    business_name: formData.get("business_name") ?? "",
    city: formData.get("city") ?? "",
    address: formData.get("address") ?? "",
    logo_path: formData.get("logo_path") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: OnboardingState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as OnboardingField;
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { formError: t.common.somethingWrong };

  // Best effort: remove the previous logo file once it's been replaced or removed (or the user is no
  // longer a dealer).
  if (profile.logo_path && profile.logo_path !== parsed.data.logo_path) {
    await supabase.storage.from(STORAGE_BUCKETS.logos).remove([profile.logo_path]);
  }

  // First-time setup goes on to My cars; editing goes back to the profile.
  redirect(isProfileComplete(profile) ? "/app/profile" : "/app");
}
