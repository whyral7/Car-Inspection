"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
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
    <section className="flex animate-rise-in items-start gap-4 rounded-card bg-surface p-4 shadow-card">
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static app icon */}
      <img src="/icons/icon-192.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-control" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t.install.title}</p>
        <p className="text-small text-ink-muted">{t.install.body}</p>
        <Button size="sm" onClick={install} className="mt-4">
          {t.install.action}
        </Button>
      </div>
      <button type="button" onClick={dismiss} aria-label={t.common.close} className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-sunken">
        <XIcon size={18} />
      </button>
    </section>
  );
}
