import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/brand-header";
import { ConnectionBanner } from "@/components/connection-banner";
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
      <BrandHeader href="/app" homeLabel={`${t.appName}: ${t.dashboard.myCars}`}>
        {/* Profile, language and log out live behind this; the name shows on the profile page. */}
        <Link href="/app/profile" aria-label={`${name}, ${t.profile.title}`} className="flex size-11 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-surface-sunken">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- small public logo, no need for the image optimiser
            <img src={logo} alt="" className="size-9 rounded-md border border-border bg-surface object-contain" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-md bg-surface-sunken type-title-sm text-text">{name.charAt(0).toUpperCase()}</span>
          )}
        </Link>
      </BrandHeader>
      <ConnectionBanner />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</main>
    </div>
  );
}
