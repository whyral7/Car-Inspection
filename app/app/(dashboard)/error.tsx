"use client";

import { Button, LinkButton } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import { AlertIcon } from "@/components/icons";
import { StatusPage } from "@/components/status-page";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <StatusPage icon={<AlertIcon size={28} />} title={t.errorPage.title} body={offline ? t.common.offline : t.common.serverError}>
      <Button onClick={reset}>{t.common.retry}</Button>
      <LinkButton href="/app" variant="secondary">
        {t.common.goHome}
      </LinkButton>
    </StatusPage>
  );
}
