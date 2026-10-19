import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditsBadge } from "@/components/credits-badge";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentDealer, isProfileComplete } from "@/lib/dealer";
import { logoUrl } from "@/lib/storage";
import { t } from "@/lib/strings";

export default async function DashboardLayout({ children }: LayoutProps<"/app">) {
  const { dealer } = await getCurrentDealer();
  if (!isProfileComplete(dealer)) redirect("/app/onboarding");

  const logo = logoUrl(dealer.logo_path);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-2">
          <Link href="/app/profile" className="flex min-h-11 min-w-0 flex-1 items-center gap-3" aria-label={t.profile.title}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- small public logo, no need for the image optimiser
              <img src={logo} alt="" className="size-9 shrink-0 rounded-lg border border-slate-200 object-contain" />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
                {dealer.business_name?.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate font-semibold">{dealer.business_name}</span>
          </Link>
          <Link href="/app/credits" className="flex min-h-11 items-center">
            <CreditsBadge credits={dealer.credits} />
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</main>
    </div>
  );
}
