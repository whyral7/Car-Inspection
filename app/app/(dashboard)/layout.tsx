import Link from "next/link";
import { redirect } from "next/navigation";
import { ConnectionBanner } from "@/components/connection-banner";
import { CreditsBadge } from "@/components/credits-badge";
import { getT } from "@/lib/i18n.server";
import { displayName, getCurrentProfile, isProfileComplete } from "@/lib/profile";
import { logoUrl } from "@/lib/storage";

export default async function DashboardLayout({ children }: LayoutProps<"/app">) {
  const t = await getT();
  const { profile } = await getCurrentProfile();
  if (!isProfileComplete(profile)) redirect("/app/onboarding");

  const logo = profile.user_type === "dealer" ? logoUrl(profile.logo_path) : null;
  const name = displayName(profile);

  return (
    <div className="flex flex-1 flex-col">
      {/* Log out lives on the profile page, away from where thumbs land while scrolling. */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
          <Link href="/app/profile" className="flex min-h-11 min-w-0 flex-1 basis-40 items-center gap-3" aria-label={`${name}, ${t.profile.title}`}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- small public logo, no need for the image optimiser
              <img src={logo} alt="" className="size-9 shrink-0 rounded-chip border border-line object-contain" />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-chip bg-brand-700 text-small font-bold text-white">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="line-clamp-2 min-w-0 font-semibold leading-tight break-words">{name}</span>
          </Link>
          <Link href="/app/credits" className="flex min-h-11 items-center">
            <CreditsBadge credits={profile.credits} t={t} />
          </Link>
        </div>
      </header>
      <ConnectionBanner />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</main>
    </div>
  );
}
