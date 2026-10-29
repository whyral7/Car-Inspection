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
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-16 w-full max-w-2xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Link
            href="/app/profile"
            className="-ml-2 flex min-h-12 min-w-0 flex-1 basis-40 items-center gap-3 rounded-control px-2 transition-colors hover:bg-canvas"
            aria-label={`${name}, ${t.profile.title}`}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- small public logo, no need for the image optimiser
              <img src={logo} alt="" className="size-10 shrink-0 rounded-control bg-surface object-contain ring-1 ring-line" />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-700 font-semibold text-white">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="line-clamp-2 min-w-0 font-semibold leading-tight break-words">{name}</span>
          </Link>
          <Link href="/app/credits" className="flex min-h-11 items-center rounded-full">
            <CreditsBadge credits={profile.credits} t={t} />
          </Link>
        </div>
      </header>
      <ConnectionBanner />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</main>
    </div>
  );
}
