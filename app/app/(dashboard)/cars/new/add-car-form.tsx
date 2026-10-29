"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/button";
import { Field, FormError, SelectField } from "@/components/field";
import { FUELS, MAX_OWNERS, MIN_CAR_YEAR, TRANSMISSIONS, maxCarYear } from "@/lib/cars";
import { useT } from "@/components/i18n-provider";
import { errorText } from "@/lib/i18n";
import type { Strings } from "@/lib/strings";
import { normaliseRegNumber, regNumberSchema } from "@/lib/validation/car";
import { createCar, lookupRegNumber, type CarFormValues, type CreateCarState, type LookupState } from "./actions";

type Lookup = Exclude<LookupState, { error: string }>;

const fuelOptions = (t: Strings) => FUELS.map((value) => ({ value, label: t.cars.fuels[value] }));
const transmissionOptions = (t: Strings) => TRANSMISSIONS.map((value) => ({ value, label: t.cars.transmissions[value] }));

const notices = (t: Strings): Record<Lookup["status"], { text: string; tone: string } | null> => ({
  found: { text: t.cars.found, tone: "bg-brand-50 text-brand-800" },
  not_found: { text: t.cars.notFound, tone: "bg-amber-50 text-amber-800" },
  unavailable: { text: t.cars.unavailable, tone: "bg-amber-50 text-amber-800" },
  manual: null,
});

export function AddCarForm() {
  const t = useT();
  const [reg, setReg] = useState("");
  const [regError, setRegError] = useState<string | undefined>();
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [looking, setLooking] = useState<"rc" | "manual" | null>(null);

  async function runLookup(manual: boolean) {
    const parsed = regNumberSchema.safeParse(reg);
    if (!parsed.success) {
      setRegError(errorText(t, parsed.error.issues[0]?.message));
      return;
    }
    setRegError(undefined);
    setLooking(manual ? "manual" : "rc");
    try {
      const result = await lookupRegNumber(parsed.data, manual);
      if ("error" in result) setRegError(result.error);
      else setLookup(result);
    } catch {
      setRegError(navigator.onLine ? t.cars.errors.lookupFailed : t.common.offline);
    } finally {
      setLooking(null);
    }
  }

  function onRegSubmit(e: FormEvent) {
    e.preventDefault();
    void runLookup(false);
  }

  if (lookup) return <CarDetailsForm lookup={lookup} onChangeReg={() => setLookup(null)} />;

  return (
    <form onSubmit={onRegSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <Field
        label={t.cars.regNumber}
        name="reg_number"
        value={reg}
        onChange={(e) => {
          setReg(normaliseRegNumber(e.target.value));
          setRegError(undefined);
        }}
        placeholder={t.cars.regPlaceholder}
        hint={t.cars.regHint}
        error={regError}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        // Room for pasted spaces and hyphens; they're stripped as the dealer types.
        maxLength={20}
        autoFocus
        className="[&_input]:text-lg [&_input]:font-semibold [&_input]:tracking-widest"
      />
      <Button type="submit" loading={looking === "rc"} disabled={looking !== null}>
        {looking === "rc" ? t.cars.lookingUp : t.cars.findDetails}
      </Button>
      <Button type="button" variant="ghost" loading={looking === "manual"} disabled={looking !== null} onClick={() => void runLookup(true)}>
        {t.cars.enterManually}
      </Button>
    </form>
  );
}

function CarDetailsForm({ lookup, onChangeReg }: { lookup: Lookup; onChangeReg: () => void }) {
  const t = useT();
  const [state, setState] = useState<CreateCarState>({});
  const [isPending, startTransition] = useTransition();
  const firstField = useRef<HTMLInputElement>(null);
  const notice = notices(t)[lookup.status];
  const errors = state.fieldErrors ?? {};
  const v = lookup.values;

  // Manual entry starts with an empty form, so put the cursor in it.
  useEffect(() => {
    if (lookup.status !== "found") firstField.current?.focus();
  }, [lookup.status]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: keyof CarFormValues) => String(form.get(k) ?? "");
    const input = {
      reg_number: lookup.regNumber,
      rc_raw: lookup.rcRaw,
      make: get("make"),
      model: get("model"),
      variant: get("variant"),
      fuel: get("fuel"),
      transmission: get("transmission"),
      year: get("year"),
      owners: get("owners"),
      insurance_valid_upto: get("insurance_valid_upto"),
    };
    startTransition(async () => {
      try {
        // On success the action redirects, so a returned value means there's something to show.
        setState((await createCar(input)) ?? {});
      } catch {
        setState({ formError: navigator.onLine ? t.common.somethingWrong : t.common.offline });
      }
    });
  }

  function clearFieldError(name: string) {
    if (!errors[name as keyof typeof errors]) return;
    setState((s) => ({ ...s, fieldErrors: { ...s.fieldErrors, [name]: undefined } }));
  }

  return (
    <form
      onSubmit={onSubmit}
      onInput={(e) => clearFieldError((e.target as HTMLInputElement).name)}
      className="mt-6 flex flex-col gap-5"
      noValidate
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="min-w-0">
          <p className="text-sm text-slate-600">{t.cars.regNumber}</p>
          <p className="truncate text-xl font-bold tracking-widest">{lookup.regNumber}</p>
        </div>
        <Button type="button" variant="secondary" onClick={onChangeReg} disabled={isPending} className="min-h-11 shrink-0 px-4 text-sm">
          {t.cars.change}
        </Button>
      </div>

      {lookup.existingCarId && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.cars.duplicate}{" "}
          <Link href={`/app/cars/${lookup.existingCarId}`} className="font-semibold underline underline-offset-2">
            {t.cars.openExisting}
          </Link>
        </p>
      )}
      {notice && <p className={`rounded-xl px-4 py-3 text-sm ${notice.tone}`}>{notice.text}</p>}

      <Field
        ref={firstField}
        label={t.cars.make}
        name="make"
        defaultValue={v.make}
        placeholder={t.cars.makePlaceholder}
        error={errors.make}
        autoCapitalize="words"
        autoComplete="off"
        required
      />
      <Field label={t.cars.model} name="model" defaultValue={v.model} placeholder={t.cars.modelPlaceholder} error={errors.model} autoComplete="off" required />
      <Field label={t.cars.variant} name="variant" defaultValue={v.variant} placeholder={t.cars.variantPlaceholder} error={errors.variant} autoComplete="off" />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label={t.cars.fuel} name="fuel" options={fuelOptions(t)} placeholder={t.cars.choose} defaultValue={v.fuel} error={errors.fuel} />
        <SelectField
          label={t.cars.transmission}
          name="transmission"
          options={transmissionOptions(t)}
          placeholder={t.cars.choose}
          defaultValue={v.transmission}
          error={errors.transmission}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={t.cars.year}
          name="year"
          type="number"
          inputMode="numeric"
          min={MIN_CAR_YEAR}
          max={maxCarYear()}
          defaultValue={v.year}
          placeholder="2019"
          error={errors.year}
          required
        />
        <Field
          label={t.cars.owners}
          name="owners"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_OWNERS}
          defaultValue={v.owners}
          placeholder="1"
          error={errors.owners}
        />
      </div>
      <Field
        label={t.cars.insurance}
        name="insurance_valid_upto"
        type="date"
        defaultValue={v.insurance_valid_upto}
        error={errors.insurance_valid_upto}
      />

      <FormError message={state.formError} />
      <Button type="submit" loading={isPending}>
        {isPending ? t.cars.saving : t.cars.save}
      </Button>
    </form>
  );
}
