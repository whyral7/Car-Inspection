"use client";

import type { CarFormValues } from "@/app/app/(dashboard)/cars/new/actions";
import { Field, SelectField } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import { FUELS, TRANSMISSIONS } from "@/lib/cars";

/** Make, model, variant, fuel, transmission, year, owners and insurance: used by Add car and Edit car. */
export function CarFields({ values, errors }: { values: CarFormValues; errors: Partial<Record<keyof CarFormValues, string>> }) {
  const t = useT();
  const fuelOptions = FUELS.map((value) => ({ value, label: t.cars.fuels[value] }));
  const transmissionOptions = TRANSMISSIONS.map((value) => ({ value, label: t.cars.transmissions[value] }));

  return (
    <>
      <Field label={t.cars.make} name="make" defaultValue={values.make} placeholder={t.cars.makePlaceholder} error={errors.make} autoCapitalize="words" autoComplete="off" required />
      <Field label={t.cars.model} name="model" defaultValue={values.model} placeholder={t.cars.modelPlaceholder} error={errors.model} autoCapitalize="words" autoComplete="off" required />
      <Field label={t.cars.variant} name="variant" defaultValue={values.variant} placeholder={t.cars.variantPlaceholder} error={errors.variant} autoComplete="off" />
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <SelectField label={t.cars.fuel} name="fuel" options={fuelOptions} placeholder={t.cars.choose} defaultValue={values.fuel} error={errors.fuel} />
        <SelectField label={t.cars.transmission} name="transmission" options={transmissionOptions} placeholder={t.cars.choose} defaultValue={values.transmission} error={errors.transmission} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* Text with a number keypad: type="number" adds spinners on desktop and accepts "e". */}
        <Field label={t.cars.year} name="year" inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="off" defaultValue={values.year} placeholder="2019" error={errors.year} required />
        <Field label={t.cars.owners} name="owners" inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" defaultValue={values.owners} placeholder="1" error={errors.owners} />
      </div>
      <Field label={t.cars.insurance} name="insurance_valid_upto" type="date" defaultValue={values.insurance_valid_upto} error={errors.insurance_valid_upto} />
    </>
  );
}

/** Reads the CarFields inputs from a submitted form. */
export function carFormValues(form: FormData): CarFormValues {
  const get = (k: keyof CarFormValues) => String(form.get(k) ?? "");
  return {
    make: get("make"),
    model: get("model"),
    variant: get("variant"),
    fuel: get("fuel"),
    transmission: get("transmission"),
    year: get("year"),
    owners: get("owners"),
    insurance_valid_upto: get("insurance_valid_upto"),
  };
}
