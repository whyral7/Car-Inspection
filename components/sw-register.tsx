"use client";

import { useEffect } from "react";

/** Registers the service worker in production so Android Chrome offers "Install app". */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not fatal: the app works without it, it just won't be installable.
    });
  }, []);
  return null;
}
