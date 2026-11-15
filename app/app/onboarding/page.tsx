import type { Metadata } from "next";
import { BrandHeader } from "@/components/brand-header";
import { SignOut } from "@/components/sign-out";
import { getCurrentProfile, isProfileComplete } from "@/lib/profile";
import { logoUrl } from "@/lib/storage";
import { getT } from "@/lib/i18n.server";
import { OnboardingForm } from "./onboarding-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.onboarding.title };
}

export default async function OnboardingPage() {
  const t = await getT();
  const { user, profile } = await getCurrentProfile();
  const editing = isProfileComplete(profile);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <BrandHeader plain href={editing ? "/app" : "/"} homeLabel={t.appName}>
        {/* Signed in with the wrong number? Way out before the profile is set up. */}
        {!editing && <SignOut compact />}
      </BrandHeader>
      <header className="flex flex-col gap-1">
        <h1 className="type-heading-1">{editing ? t.onboarding.editTitle : t.onboarding.title}</h1>
        <p className="text-text-muted">{t.onboarding.subtitle}</p>
      </header>
      <OnboardingForm
        profileId={user.id}
        cancelHref={editing ? "/app/profile" : undefined}
        initial={{
          user_type: profile.user_type,
          owner_name: profile.owner_name ?? "",
          business_name: profile.business_name ?? "",
          city: profile.city ?? "",
          address: profile.address ?? "",
          logo_path: profile.logo_path,
          logo_url: logoUrl(profile.logo_path),
        }}
      />
    </main>
  );
}
