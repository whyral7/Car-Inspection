"use server";

import { redirect } from "next/navigation";
import { STORAGE_BUCKETS } from "@/lib/config";
import { getCurrentDealer, isProfileComplete } from "@/lib/dealer";
import { t } from "@/lib/strings";
import { onboardingSchema, type OnboardingField } from "@/lib/validation/dealer";

export type OnboardingState = {
  fieldErrors?: Partial<Record<OnboardingField, string>>;
  formError?: string;
};

export async function saveDealerProfile(formData: FormData): Promise<OnboardingState> {
  const { supabase, user, dealer } = await getCurrentDealer();

  const parsed = onboardingSchema(user.id).safeParse({
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

  const { error } = await supabase.from("dealers").update(parsed.data).eq("id", user.id);
  if (error) return { formError: t.common.somethingWrong };

  // Best effort: remove the previous logo file once it's been replaced or removed.
  if (dealer.logo_path && dealer.logo_path !== parsed.data.logo_path) {
    await supabase.storage.from(STORAGE_BUCKETS.logos).remove([dealer.logo_path]);
  }

  // First-time setup goes on to My cars; editing goes back to the profile.
  redirect(isProfileComplete(dealer) ? "/app/profile" : "/app");
}
