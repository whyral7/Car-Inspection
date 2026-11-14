"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast, type ToastTone } from "@/components/ui";

/**
 * Shows a toast once after a redirect (e.g. "Car deleted" on ?deleted=1), then removes the query
 * parameter so a reload or the back button doesn't show it again.
 */
export function FlashToast({ param, message, tone = "success" }: { param: string; message: string; tone?: ToastTone }) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || !params.has(param)) return;
    shown.current = true;
    toast.show({ tone, message });
    const rest = new URLSearchParams(params);
    rest.delete(param);
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [param, message, tone, toast, router, pathname, params]);

  return null;
}
