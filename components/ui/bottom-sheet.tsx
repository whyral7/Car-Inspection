"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { XIcon } from "@/components/icons";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { FormError } from "@/components/ui/input";

/**
 * A panel that slides up from the bottom on phones (centred on wide screens). Built on <dialog>, so
 * focus is trapped, Esc and the backdrop close it, and the page behind can't be scrolled or tapped.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel,
  role,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  closeLabel: string;
  role?: "alertdialog";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="mx-auto mt-auto mb-0 max-h-[90dvh] w-full max-w-none animate-sheet-in overflow-y-auto rounded-t-sheet bg-surface p-0 text-ink shadow-sheet sm:my-auto sm:max-w-md sm:animate-rise-in sm:rounded-sheet"
    >
      {open && (
        <div className="flex flex-col gap-4 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
          <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id={titleId} className="text-heading">
                {title}
              </h2>
              {description && (
                <div id={descId} className="text-small text-ink-muted">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-sunken"
            >
              <XIcon size={20} />
            </button>
          </div>
          {children}
          {footer && <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/**
 * "Are you sure?" for destructive actions. `onConfirm` may be async: the button shows a spinner,
 * and a returned error message (or a thrown error) is shown in the sheet instead of closing it.
 */
export function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel,
  closeLabel,
  onConfirm,
  variant = "danger",
  errorFallback,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  onConfirm: () => Promise<string | null | void> | string | null | void;
  variant?: ButtonVariant;
  errorFallback: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (pending) return;
    setError(null);
    onClose();
  }

  async function confirm() {
    setError(null);
    setPending(true);
    try {
      const result = await onConfirm();
      if (typeof result === "string") setError(result);
      else onClose();
    } catch {
      setError(errorFallback);
    } finally {
      setPending(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={title}
      description={description}
      closeLabel={closeLabel}
      role="alertdialog"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={pending} autoFocus className="sm:min-w-28">
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={confirm} loading={pending} className="sm:min-w-28">
            {confirmLabel}
          </Button>
        </>
      }
    >
      <FormError message={error} />
    </BottomSheet>
  );
}
