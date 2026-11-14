"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useT } from "@/components/i18n-provider";
import { WifiOffIcon } from "@/components/icons";
import { useToast } from "@/components/ui";

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

/** A slim bar under the header while offline, so failed taps aren't a mystery; a toast when it's back. */
export function ConnectionBanner() {
  const t = useT();
  const online = useOnline();
  const toast = useToast();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) {
      wasOffline.current = false;
      toast.show({ tone: "success", message: t.common.backOnline });
    }
  }, [online, toast, t]);

  if (online) return null;
  return (
    <div role="status" className="flex animate-fade-in items-center justify-center gap-2 bg-ink px-4 py-2 text-small font-medium text-white">
      <WifiOffIcon size={16} />
      {t.common.offlineBanner}
    </div>
  );
}
