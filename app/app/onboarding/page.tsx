import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
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
      <div className="flex items-center justify-between">
        <Link href="/" className="self-start" aria-label={t.appName}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG; small lockup suits a page header */}
        <img src="/brand/treadmark-lockup-small-color.svg" alt={t.appName} width={136} height={28} className="h-7 w-auto" />
      </Link>
        <LogoutButton />
      </div>
      <h1 className="mt-6 type-heading-1">{editing ? t.onboarding.editTitle : t.onboarding.title}</h1>
      <p className="mt-1 text-text-muted">{t.onboarding.subtitle}</p>
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
