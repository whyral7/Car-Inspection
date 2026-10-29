"use client";

import { useState, useTransition } from "react";
import { deleteCar } from "@/app/app/(dashboard)/cars/[id]/actions";
import { Button } from "@/components/button";
import { FormError } from "@/components/field";
import { useT } from "@/components/i18n-provider";
import { TrashIcon } from "@/components/icons";

/** "Delete this car", behind a confirmation that says exactly what goes. */
export function DeleteCar({ carId, regNumber, published }: { carId: string; regNumber: string; published: boolean }) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-11 items-center gap-2 self-center text-sm font-semibold text-red-700">
        <TrashIcon size={18} />
        {t.car.deleteCar}
      </button>
    );
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      try {
        // Redirects to My cars on success.
        const res = await deleteCar(carId);
        setError(res.error);
      } catch {
        setError(navigator.onLine ? t.car.deleteFailed : t.common.offline);
      }
    });
  }

  return (
    <section role="alertdialog" aria-labelledby="delete-car-title" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
      <p id="delete-car-title" className="font-medium text-red-900">
        {t.car.deleteConfirm(regNumber)} {published && t.car.deleteConfirmPublished}
      </p>
      <FormError message={error} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending} autoFocus>
          {t.common.cancel}
        </Button>
        <Button variant="danger" onClick={onDelete} loading={pending}>
          {t.car.deleteAction}
        </Button>
      </div>
    </section>
  );
}
