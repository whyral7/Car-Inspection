"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { CheckIcon, ShareIcon } from "@/components/icons";

/**
 * Opens the phone's share sheet (WhatsApp, SMS, email…) with the report link, or copies the link
 * where sharing isn't supported (most desktop browsers).
 */
export function ShareButton({ url, title, text, className = "", label }: { url: string; title: string; text?: string; className?: string; label?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // The user closed the sheet: nothing to do. Anything else falls through to copying.
        if ((error as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t.report.copyLink, url);
    }
  }

  return (
    <button type="button" onClick={() => void share()} className={`inline-flex min-h-11 items-center justify-center gap-2 font-semibold ${className}`}>
      {copied ? <CheckIcon size={18} /> : <ShareIcon size={18} />}
      {copied ? t.report.copied : (label ?? t.publicReport.share)}
    </button>
  );
}
