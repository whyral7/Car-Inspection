import { z } from "zod";
import { t } from "@/lib/strings";

const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, message);

/** Logo must sit in the dealer's own folder in the logos bucket. */
export function logoPathPattern(dealerId: string) {
  return new RegExp(`^${dealerId}/logo-\\d+\\.(png|jpg|webp)$`);
}

export function onboardingSchema(dealerId: string) {
  return z.object({
    owner_name: text(2, 80, t.onboarding.errors.ownerName),
    business_name: text(2, 100, t.onboarding.errors.businessName),
    city: text(2, 60, t.onboarding.errors.city),
    address: text(5, 300, t.onboarding.errors.address),
    logo_path: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.string().regex(logoPathPattern(dealerId), t.onboarding.errors.logoPath).nullable(),
    ),
  });
}

export type OnboardingInput = z.infer<ReturnType<typeof onboardingSchema>>;
export type OnboardingField = keyof OnboardingInput;
