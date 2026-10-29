"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/button";
import { CarFields, carFormValues } from "@/components/car-fields";
import { FormError, focusFirstError } from "@/components/field";
import { useT } from "@/components/i18n-provider";
import { CheckIcon, InfoIcon, PencilIcon, SearchIcon } from "@/components/icons";
import { Plate } from "@/components/plate";
import { isFuel, isTransmission } from "@/lib/cars";
import { formatDate } from "@/lib/format";
import { errorText } from "@/lib/i18n";
import type { Strings } from "@/lib/strings";
import { normaliseRegNumber, regNumberSchema } from "@/lib/validation/car";
import { createCar, lookupRegNumber, type CarFormValues, type CreateCarState, type LookupState } from "./actions";

type Lookup = Exclude<LookupState, { error: string }>;

const notices = (t: Strings): Record<Lookup["status"], { text: string; tone: string } | null> => ({
  found: null,
  not_found: { text: t.cars.notFound, tone: "border-amber-300 bg-amber-50 text-amber-900" },
  unavailable: { text: t.cars.unavailable, tone: "border-amber-300 bg-amber-50 text-amber-900" },
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

  if (lookup) return <CarDetailsStep lookup={lookup} onChangeReg={() => setLookup(null)} />;

  const errorId = regError ? "reg_number-error" : undefined;
  return (
    <form onSubmit={onRegSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <div>
        <label htmlFor="reg_number" className="mb-1.5 block text-sm font-semibold text-slate-800">
          {t.cars.regNumber}
        </label>
        {/* Styled like a number plate, so it's obvious what to type. */}
        <input
          id="reg_number"
          name="reg_number"
          value={reg}
          onChange={(e) => {
            setReg(normaliseRegNumber(e.target.value));
            setRegError(undefined);
          }}
          placeholder={t.cars.regPlaceholder}
          aria-invalid={Boolean(regError)}
          aria-describedby={errorId ?? "reg_number-hint"}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          // Room for pasted spaces and hyphens; they're stripped as the user types.
          maxLength={20}
          autoFocus
          className="block min-h-16 w-full rounded-xl border-2 border-ink bg-white px-4 text-center text-2xl font-bold tracking-[0.12em] text-ink uppercase placeholder:font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-100 aria-invalid:border-red-600"
        />
        {regError ? (
          <p id={errorId} className="mt-1.5 text-sm font-medium text-red-700">
            {regError}
          </p>
        ) : (
          <p id="reg_number-hint" className="mt-1.5 text-sm text-slate-600">
            {t.cars.regHint}
          </p>
        )}
      </div>
      <Button type="submit" loading={looking === "rc"} disabled={looking !== null}>
        {looking === "rc" ? (
          t.cars.lookingUp
        ) : (
          <>
            <SearchIcon size={20} />
            {t.cars.findDetails}
          </>
        )}
      </Button>
      <div className="flex flex-col items-center">
        <p className="text-sm text-slate-600">{t.cars.noRc}</p>
        <Button type="button" variant="ghost" loading={looking === "manual"} disabled={looking !== null} onClick={() => void runLookup(true)} className="min-h-11 px-3">
          {t.cars.enterManually}
        </Button>
      </div>
    </form>
  );
}

/** After the number: a summary to confirm when the RC was found, otherwise the details form. */
function CarDetailsStep({ lookup, onChangeReg }: { lookup: Lookup; onChangeReg: () => void }) {
  const t = useT();
  const [state, setState] = useState<CreateCarState>({});
  const [editing, setEditing] = useState(lookup.status !== "found");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const notice = notices(t)[lookup.status];
  const errors = state.fieldErrors ?? {};

  // Manual entry starts with an empty form, so put the cursor in it.
  useEffect(() => {
    if (editing) formRef.current?.querySelector<HTMLInputElement>("input[name=make]")?.focus();
  }, [editing]);

  function save(values: CarFormValues) {
    startTransition(async () => {
      try {
        // On success the action redirects, so a returned value means there's something to show.
        const result = (await createCar({ ...values, reg_number: lookup.regNumber, rc_raw: lookup.rcRaw })) ?? {};
        setState(result);
        if (result.fieldErrors) {
          setEditing(true);
          focusFirstError(formRef.current);
        }
      } catch {
        setState({ formError: navigator.onLine ? t.common.somethingWrong : t.common.offline });
      }
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    save(carFormValues(new FormData(e.currentTarget)));
  }

  function clearFieldError(name: string) {
    if (!errors[name as keyof typeof errors]) return;
    setState((s) => ({ ...s, fieldErrors: { ...s.fieldErrors, [name]: undefined } }));
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="min-w-0">
          <p className="mb-1 text-sm text-slate-600">{t.cars.regNumber}</p>
          <Plate reg={lookup.regNumber} size="lg" />
        </div>
        <Button type="button" variant="secondary" onClick={onChangeReg} disabled={isPending} className="min-h-11 shrink-0 px-4 text-sm">
          {t.cars.change}
        </Button>
      </div>

      {lookup.existingCarId && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <InfoIcon size={18} className="mt-px" />
          <span>
            {t.cars.duplicate}{" "}
            <Link href={`/app/cars/${lookup.existingCarId}`} className="font-semibold underline underline-offset-2">
              {t.cars.openExisting}
            </Link>
          </span>
        </p>
      )}
      {notice && <p className={`rounded-xl border px-4 py-3 text-sm ${notice.tone}`}>{notice.text}</p>}

      {!editing ? (
        <RcSummary values={lookup.values} pending={isPending} onConfirm={() => save(lookup.values)} onEdit={() => setEditing(true)} error={state.formError} />
      ) : (
        <form ref={formRef} onSubmit={onSubmit} onInput={(e) => clearFieldError((e.target as HTMLInputElement).name)} className="flex flex-col gap-5" noValidate>
          <CarFields values={lookup.values} errors={errors} />
          <FormError message={state.formError} />
          <Button type="submit" loading={isPending}>
            {isPending ? t.cars.saving : t.cars.save}
          </Button>
        </form>
      )}
    </div>
  );
}

/** What the RC says, in one card: most people only need to confirm it. */
function RcSummary({ values, pending, onConfirm, onEdit, error }: { values: CarFormValues; pending: boolean; onConfirm: () => void; onEdit: () => void; error?: string }) {
  const t = useT();
  const title = [values.year, values.make, values.model, values.variant].filter(Boolean).join(" ");
  const facts = [
    isFuel(values.fuel) ? t.cars.fuels[values.fuel] : null,
    isTransmission(values.transmission) ? t.cars.transmissions[values.transmission] : null,
    values.owners ? t.cars.ownerOrdinal(Number(values.owners)) : null,
  ].filter(Boolean);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
        <CheckIcon size={18} />
        {t.cars.foundShort}
      </p>
      <div>
        <p className="text-xl font-bold">{title}</p>
        {facts.length > 0 && <p className="text-slate-700">{facts.join(" · ")}</p>}
        {values.insurance_valid_upto && (
          <p className="text-sm text-slate-700">
            {t.cars.insurance}: {formatDate(values.insurance_valid_upto)}
          </p>
        )}
      </div>
      <FormError message={error} />
      <Button onClick={onConfirm} loading={pending}>
        {pending ? t.cars.saving : t.cars.looksRight}
      </Button>
      <Button variant="secondary" onClick={onEdit} disabled={pending}>
        <PencilIcon size={18} />
        {t.cars.editFound}
      </Button>
    </section>
  );
}
