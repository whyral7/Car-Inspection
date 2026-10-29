"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertIcon, CheckIcon, InfoIcon } from "@/components/icons";

export type ToastTone = "success" | "error" | "info";

type ToastInput = {
  message: string;
  tone?: ToastTone;
  /** One action, e.g. Undo. Tapping it also closes the toast. */
  action?: { label: string; onClick: () => void };
  /** Milliseconds; errors stay a little longer by default. */
  duration?: number;
  /** Called when the toast goes away without its action being tapped. */
  onExpire?: () => void;
};

type Toast = ToastInput & { id: number };

const ToastContext = createContext<{ show: (t: ToastInput) => number; dismiss: (id?: number) => void }>({
  show: () => 0,
  dismiss: () => {},
});

/** Short confirmation after an action ("Car saved", "Link copied"), with an optional Undo. */
export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastTone, ReactNode> = {
  success: <CheckIcon size={18} className="text-success-200" />,
  error: <AlertIcon size={18} className="text-danger-200" />,
  info: <InfoIcon size={18} className="text-brand-200" />,
};

/**
 * One toast at a time, just above the sticky action bar (it reads --sticky-bar-height), so it never
 * covers the main button. Dark on light for contrast outdoors.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);
  const current = useRef<Toast | null>(null);

  const dismiss = useCallback((id?: number, expired = false) => {
    const t = current.current;
    if (!t || (id !== undefined && t.id !== id)) return;
    if (timer.current) clearTimeout(timer.current);
    current.current = null;
    setToast(null);
    if (expired) t.onExpire?.();
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      // A new toast replaces the old one; the old one counts as expired (so a pending delete goes ahead).
      dismiss(undefined, true);
      const t = { ...input, id: nextId.current++ };
      current.current = t;
      setToast(t);
      const ms = input.duration ?? (input.tone === "error" ? 6000 : input.action ? 6000 : 3500);
      timer.current = setTimeout(() => dismiss(t.id, true), ms);
      return t.id;
    },
    [dismiss],
  );

  useEffect(() => () => dismiss(undefined, true), [dismiss]);

  const value = useMemo(() => ({ show, dismiss: (id?: number) => dismiss(id) }), [show, dismiss]);

  return (
    <ToastContext value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
        style={{ bottom: "calc(var(--sticky-bar-height, 0px) + 1rem + env(safe-area-inset-bottom))" }}
      >
        {toast && (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-md animate-rise-in items-center gap-3 rounded-control bg-ink py-2 pr-2 pl-4 text-small font-medium text-white shadow-raised"
          >
            {icons[toast.tone ?? "success"]}
            <span className="min-w-0 flex-1 py-2">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="min-h-11 shrink-0 rounded-chip px-3 font-semibold text-brand-200 transition-colors hover:bg-white/10"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext>
  );
}
