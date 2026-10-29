"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Button, LinkButton } from "@/components/ui";
import { CarFields, carFormValues } from "@/components/car-fields";
import { FormError, focusFirstError } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import type { CarFormValues } from "../../new/actions";
import { updateCar, type UpdateCarState } from "../actions";

export function EditCarForm({ carId, values }: { carId: string; values: CarFormValues }) {
  const t = useT();
  const [state, setState] = useState<UpdateCarState>({});
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = carFormValues(new FormData(e.currentTarget));
    startTransition(async () => {
      try {
        // Redirects back to the car on success.
        const result = (await updateCar(carId, input)) ?? {};
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
      className="mt-4 flex flex-col gap-5"
      noValidate
    >
      <CarFields values={values} errors={errors} />
      <FormError message={state.formError} />
      <Button type="submit" loading={isPending}>
        {isPending ? t.cars.saving : t.common.save}
      </Button>
      <LinkButton href={`/app/cars/${carId}`} variant="secondary">
        {t.common.cancel}
      </LinkButton>
    </form>
  );
}
