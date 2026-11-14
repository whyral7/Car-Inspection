import Link from "next/link";
import { LinkButton } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { StatusPage } from "@/components/status-page";
import { SAMPLE_REPORT_PATH } from "@/lib/config";
import { getT } from "@/lib/i18n.server";

export default async function ReportNotFound() {
  const t = await getT();
  return (
    <main className="flex flex-1 flex-col">
      {/* A buyer may land here from a WhatsApp link: show whose site this is. */}
      <header className="mx-auto flex w-full max-w-md px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <Link href="/" className="flex min-h-11 items-center gap-2 text-heading text-brand-700">
          <span aria-hidden className="flex size-8 items-center justify-center rounded-chip bg-brand-700 text-small text-white">
            {t.appName.charAt(0)}
          </span>
          {t.appName}
        </Link>
      </header>
      <StatusPage icon={<SearchIcon size={28} />} title={t.publicReport.notFoundTitle} body={t.publicReport.notFoundBody}>
        <LinkButton href={SAMPLE_REPORT_PATH} variant="secondary">
          {t.publicReport.seeSample}
        </LinkButton>
        <LinkButton href="/" variant="ghost">
          {t.common.goToSite}
        </LinkButton>
      </StatusPage>
    </main>
  );
}
