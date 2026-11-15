import Link from "next/link";
import { BrandHeader } from "@/components/brand-header";
import { buttonClass } from "@/components/ui";
import { getT } from "@/lib/i18n.server";

export async function SiteHeader() {
  const t = await getT();
  return (
    <BrandHeader homeLabel={t.appName} width="max-w-5xl">
      <Link href="/#pricing" className="hidden min-h-11 items-center rounded-sm px-4 type-label text-text-muted transition-colors hover:text-text sm:flex">
        {t.home.nav.pricing}
      </Link>
      <Link href="/login" className={buttonClass("secondary", "", false, "sm")}>
        {t.home.nav.login}
      </Link>
    </BrandHeader>
  );
}
