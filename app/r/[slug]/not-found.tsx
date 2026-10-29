import { LinkButton } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { StatusPage } from "@/components/status-page";
import { SAMPLE_REPORT_PATH } from "@/lib/config";
import { getT } from "@/lib/i18n.server";

export default async function ReportNotFound() {
  const t = await getT();
  return (
    <main className="flex flex-1 flex-col">
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
