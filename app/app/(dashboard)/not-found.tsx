import { LinkButton } from "@/components/button";
import { SearchIcon } from "@/components/icons";
import { StatusPage } from "@/components/status-page";
import { getT } from "@/lib/i18n.server";

export default async function DashboardNotFound() {
  const t = await getT();
  return (
    <StatusPage icon={<SearchIcon size={28} />} title={t.errorPage.notFoundTitle} body={t.errorPage.notFoundBody}>
      <LinkButton href="/app">{t.common.goHome}</LinkButton>
    </StatusPage>
  );
}
