import type { Metadata } from "next";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-4 pb-10">
      <p className="text-xl font-bold text-brand-700">{t.appName}</p>
      <h1 className="mt-6 text-2xl font-bold">{editing ? t.onboarding.editTitle : t.onboarding.title}</h1>
      <p className="mt-1 text-slate-600">{t.onboarding.subtitle}</p>
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
      {!editing && (
        <div className="mt-6 flex justify-center">
          <SignOut compact />
        </div>
      )}
    </main>
  );
}
