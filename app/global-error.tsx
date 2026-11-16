"use client";

import { fontVariables } from "@/brand/next/fonts";
import { buttonClass } from "@/components/ui/button";
import "./globals.css";

// Last resort when the root layout itself fails. It replaces that layout, so it brings the brand
// stylesheet and fonts itself. English only: the reader's language can't be read here.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" data-theme="light" className={`h-full ${fontVariables}`}>
      <body className="flex min-h-full flex-col items-center justify-center gap-4 bg-bg p-6 text-center text-text">
        <h1 className="type-heading-1">This page didn&apos;t load</h1>
        <p className="type-body text-text-muted">Check your internet and try again in a minute.</p>
        <button type="button" onClick={reset} className={buttonClass("primary", "", false, "lg")}>
          Try again
        </button>
      </body>
    </html>
  );
}
