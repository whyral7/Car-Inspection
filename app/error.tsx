"use client";

import { Button, LinkButton } from "@/components/button";
import { AlertIcon } from "@/components/icons";
import { StatusPage } from "@/components/status-page";
import { en as t } from "@/lib/strings";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col">
      <StatusPage icon={<AlertIcon size={28} />} title={t.errorPage.title} body={t.common.serverError}>
        <Button onClick={reset}>{t.common.retry}</Button>
        <LinkButton href="/" variant="secondary">
          {t.common.goToSite}
        </LinkButton>
      </StatusPage>
    </main>
  );
}
