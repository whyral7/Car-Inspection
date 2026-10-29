import { z } from "zod";
import { t } from "@/lib/strings";
import { USER_TYPES } from "@/lib/user-type";

const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, message);

/** Empty or blank becomes null; anything else must pass `schema`. */
const optional = (schema: z.ZodString) =>
  z.preprocess((v) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v), schema.nullable());

/** Logo must sit in the user's own folder in the logos bucket. */
export function logoPathPattern(profileId: string) {
  return new RegExp(`^${profileId}/logo-\\d+\\.(png|jpg|webp)$`);
}

/**
 * Signup and edit-profile form. Business name, address and logo are optional and only kept for
 * dealers; for anyone else they are cleared, so switching away from dealer removes them.
 */
export function onboardingSchema(profileId: string) {
  return z
    .object({
      user_type: z.enum(USER_TYPES, t.onboarding.errors.userType),
      owner_name: text(2, 80, t.onboarding.errors.ownerName),
      city: text(2, 60, t.onboarding.errors.city),
      business_name: optional(text(2, 100, t.onboarding.errors.businessName)),
      address: optional(text(5, 300, t.onboarding.errors.address)),
      logo_path: optional(z.string().regex(logoPathPattern(profileId), t.onboarding.errors.logoPath)),
    })
    .transform((d) => (d.user_type === "dealer" ? d : { ...d, business_name: null, address: null, logo_path: null }));
}

export type OnboardingInput = z.infer<ReturnType<typeof onboardingSchema>>;
export type OnboardingField = keyof OnboardingInput;
