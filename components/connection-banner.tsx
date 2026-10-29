"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/components/i18n-provider";
import { WifiOffIcon } from "@/components/icons";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** True while the browser reports no connection. Always false on the server. */
export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** A slim bar under the header while offline, so failed taps aren't a mystery. */
export function ConnectionBanner() {
  const t = useT();
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-slate-800 px-4 py-2 text-sm font-medium text-white">
      <WifiOffIcon size={16} />
      {t.common.offlineBanner}
    </div>
  );
}
