"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { useT } from "@/components/i18n-provider";
import { XIcon } from "@/components/icons";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISSED_KEY = "treadmark:install-dismissed";

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * "Add Treadmark to your home screen", offered once the user has got value from the app (after their
 * first published report). Android Chrome only: it relies on the beforeinstallprompt event.
 */
export function InstallPrompt({ eligible }: { eligible: boolean }) {
  const t = useT();
  const [event, setEvent] = useState<InstallEvent | null>(null);
  // Nothing renders before the browser fires beforeinstallprompt, so reading storage here is hydration-safe.
  const [hidden, setHidden] = useState(() => typeof window === "undefined" || wasDismissed());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!eligible || !event || hidden) return null;

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private mode: it just shows again next time.
    }
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") setEvent(null);
    else dismiss();
  }

  return (
    <section className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static app icon */}
      <img src="/icons/icon-192.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t.install.title}</p>
        <p className="text-sm text-slate-700">{t.install.body}</p>
        <Button onClick={install} className="mt-3 min-h-11 px-4 text-sm">
          {t.install.action}
        </Button>
      </div>
      <button type="button" onClick={dismiss} aria-label={t.common.close} className="-m-2 flex size-11 shrink-0 items-center justify-center text-slate-600">
        <XIcon size={18} />
      </button>
    </section>
  );
}
