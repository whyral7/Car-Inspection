"use client";

import { useState } from "react";
import { deleteCar } from "@/app/app/(dashboard)/cars/[id]/actions";
import { useT } from "@/components/i18n-provider";
import { TrashIcon } from "@/components/icons";
import { ConfirmSheet, TextButton } from "@/components/ui";
import { forgetCar } from "@/lib/resume";

/** "Delete this car", behind a confirmation sheet that says exactly what goes. */
export function DeleteCar({ carId, regNumber, published }: { carId: string; regNumber: string; published: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TextButton tone="danger" onClick={() => setOpen(true)} className="self-center">
        <TrashIcon size={18} />
        {t.car.deleteCar}
      </TextButton>
      <ConfirmSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t.car.deleteAction}
        description={`${t.car.deleteConfirm(regNumber)}${published ? ` ${t.car.deleteConfirmPublished}` : ""}`}
        confirmLabel={t.car.deleteAction}
        cancelLabel={t.common.cancel}
        closeLabel={t.common.close}
        errorFallback={t.car.deleteFailed}
        onConfirm={async () => {
          if (!navigator.onLine) return t.common.offline;
          forgetCar(carId);
          // Redirects to My cars on success.
          const res = await deleteCar(carId);
          return res.error;
        }}
      />
    </>
  );
}
