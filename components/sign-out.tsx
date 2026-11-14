"use client";

import { useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { LogoutIcon } from "@/components/icons";
import { Button, ConfirmSheet, TextButton } from "@/components/ui";

/** Log out, behind a confirmation: logging back in needs a fresh OTP. */
export function SignOut({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  return (
    <>
      {compact ? (
        <TextButton tone="muted" onClick={() => setOpen(true)}>
          <LogoutIcon size={18} />
          {t.common.logout}
        </TextButton>
      ) : (
        <Button variant="secondary" icon={<LogoutIcon size={18} />} onClick={() => setOpen(true)} className="w-full">
          {t.common.logout}
        </Button>
      )}
      <form ref={form} action="/auth/signout" method="post" hidden />
      <ConfirmSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t.common.logout}
        description={t.profile.logoutConfirm}
        confirmLabel={t.common.logout}
        cancelLabel={t.common.cancel}
        closeLabel={t.common.close}
        errorFallback={t.common.somethingWrong}
        onConfirm={async () => {
          form.current?.submit();
          // The page navigates away; keep the spinner until it does.
          await new Promise(() => {});
        }}
      />
    </>
  );
}
