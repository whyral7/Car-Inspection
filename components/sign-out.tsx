"use client";

import { useState } from "react";
import { Button, buttonClass } from "@/components/button";
import { useT } from "@/components/i18n-provider";
import { LogoutIcon } from "@/components/icons";

/** Log out, behind a confirmation: logging back in needs a fresh OTP. */
export function SignOut({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={compact ? "inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate-700" : buttonClass("secondary", "w-full")}
      >
        <LogoutIcon size={18} />
        {t.common.logout}
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-labelledby="signout-title" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
      <p id="signout-title" className="font-medium">
        {t.profile.logoutConfirm}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setConfirming(false)} autoFocus>
          {t.common.cancel}
        </Button>
        <form action="/auth/signout" method="post" className="contents">
          <Button type="submit" variant="danger">
            {t.common.logout}
          </Button>
        </form>
      </div>
    </div>
  );
}
