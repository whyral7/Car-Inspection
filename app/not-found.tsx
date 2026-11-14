import { LinkButton } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { StatusPage } from "@/components/status-page";
import { en as t } from "@/lib/strings";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <StatusPage icon={<SearchIcon size={28} />} title={t.errorPage.pageNotFoundTitle} body={t.errorPage.pageNotFoundBody}>
        <LinkButton href="/">{t.common.goToSite}</LinkButton>
        <LinkButton href="/app" variant="secondary">
          {t.common.goHome}
        </LinkButton>
      </StatusPage>
    </main>
  );
}
