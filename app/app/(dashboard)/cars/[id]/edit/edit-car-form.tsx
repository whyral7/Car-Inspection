"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { CarFields, carFormValues } from "@/components/car-fields";
import { useT } from "@/components/i18n-provider";
import { Button, Card, FormError, LinkButton, StickyBar, focusFirstError, useToast } from "@/components/ui";
import { clearDraft, useFormDraft } from "@/lib/draft";
import type { CarFormValues } from "../../new/actions";
import { updateCar, type UpdateCarState } from "../actions";

export function EditCarForm({ carId, values }: { carId: string; values: CarFormValues }) {
  const t = useT();
  const [state, setState] = useState<UpdateCarState>({});
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const errors = state.fieldErrors ?? {};
  const draftKey = `car-edit:${carId}`;
  useFormDraft(draftKey, formRef, () => toast.show({ tone: "info", message: t.common.draftRestored }));

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = carFormValues(new FormData(e.currentTarget));
    startTransition(async () => {
      try {
        // Redirects back to the car on success.
        const result = (await updateCar(carId, input)) ?? {};
        if (!result.formError && !result.fieldErrors) clearDraft(draftKey);
        setState(result);
        if (result.fieldErrors) focusFirstError(formRef.current);
      } catch {
        setState({ formError: navigator.onLine ? t.common.somethingWrong : t.common.offline });
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onInput={(e) => {
        const name = (e.target as HTMLInputElement).name as keyof typeof errors;
        if (errors[name]) setState((s) => ({ ...s, fieldErrors: { ...s.fieldErrors, [name]: undefined } }));
      }}
      className="flex flex-1 flex-col gap-6"
      noValidate
    >
      <Card className="flex flex-col gap-6">
        <CarFields values={values} errors={errors} />
      </Card>
      <FormError message={state.formError} />
      <StickyBar className="!flex-row">
        <LinkButton href={`/app/cars/${carId}`} variant="secondary" onClick={() => clearDraft(draftKey)} className="flex-1">
          {t.common.cancel}
        </LinkButton>
        <Button type="submit" loading={isPending} className="flex-[2]">
          {isPending ? t.cars.saving : t.common.save}
        </Button>
      </StickyBar>
    </form>
  );
}
