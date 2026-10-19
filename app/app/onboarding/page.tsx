import type { Metadata } from "next";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentDealer, isProfileComplete } from "@/lib/dealer";
import { logoUrl } from "@/lib/storage";
import { t } from "@/lib/strings";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: t.onboarding.title };

export default async function OnboardingPage() {
  const { user, dealer } = await getCurrentDealer();
  const editing = isProfileComplete(dealer);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-4 pb-10">
      <div className="flex items-center justify-between">
        <p className="text-xl font-bold text-brand-700">{t.appName}</p>
        <LogoutButton />
      </div>
      <h1 className="mt-6 text-2xl font-bold">{editing ? t.onboarding.editTitle : t.onboarding.title}</h1>
      <p className="mt-1 text-slate-600">{t.onboarding.subtitle}</p>
      <OnboardingForm
        dealerId={user.id}
        cancelHref={editing ? "/app" : undefined}
        initial={{
          owner_name: dealer.owner_name ?? "",
          business_name: dealer.business_name ?? "",
          city: dealer.city ?? "",
          address: dealer.address ?? "",
          logo_path: dealer.logo_path,
          logo_url: logoUrl(dealer.logo_path),
        }}
      />
    </main>
  );
}
