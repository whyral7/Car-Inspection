"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { CarFields, carFormValues } from "@/components/car-fields";
import { useT } from "@/components/i18n-provider";
import { CheckIcon, InfoIcon, PencilIcon, SearchIcon } from "@/components/icons";
import { Plate } from "@/components/plate";
import { Button, Card, FieldMessage, FormError, StickyBar, TextButton, focusFirstError, useToast } from "@/components/ui";
import { clearDraft, useFormDraft } from "@/lib/draft";
import { isFuel, isTransmission } from "@/lib/cars";
import { formatDate } from "@/lib/format";
import { errorText } from "@/lib/i18n";
import type { Strings } from "@/lib/strings";
import { normaliseRegNumber, regNumberSchema } from "@/lib/validation/car";
import { createCar, lookupRegNumber, type CarFormValues, type CreateCarState, type LookupState } from "./actions";

type Lookup = Exclude<LookupState, { error: string }>;

const notices = (t: Strings): Record<Lookup["status"], string | null> => ({
  found: null,
  not_found: t.cars.notFound,
  unavailable: t.cars.unavailable,
  manual: null,
});

/** Amber note with an icon: something to know, not an error. */
function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="flex animate-rise-in items-start gap-2 rounded-control bg-warning-50 px-4 py-3 text-small text-warning-800">
      <InfoIcon size={18} className="mt-px" />
      <span>{children}</span>
    </p>
  );
}

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
    <form onSubmit={onRegSubmit} className="flex flex-1 flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        <label htmlFor="reg_number" className="text-small font-medium">
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
          className="block min-h-16 w-full rounded-control bg-surface px-4 text-center text-title tracking-[0.12em] text-ink uppercase ring-2 ring-ink transition-shadow ring-inset placeholder:font-semibold placeholder:tracking-[0.12em] placeholder:text-line-strong focus:shadow-focus focus:outline-none aria-invalid:ring-danger-700"
        />
        <div className="-mt-2">
          {regError ? <FieldMessage id={errorId} error={regError} /> : <FieldMessage hint={<span id="reg_number-hint">{t.cars.regHint}</span>} />}
        </div>
      </Card>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-small text-ink-muted">{t.cars.noRc}</p>
        <TextButton onClick={() => void runLookup(true)} disabled={looking !== null}>
          <PencilIcon size={18} />
          {t.cars.enterManually}
        </TextButton>
      </div>
      <StickyBar>
        <Button type="submit" loading={looking === "rc"} disabled={looking !== null && looking !== "rc"} icon={<SearchIcon size={20} />}>
          {looking === "rc" ? t.cars.lookingUp : t.cars.findDetails}
        </Button>
      </StickyBar>
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
  const toast = useToast();
  const notice = notices(t)[lookup.status];
  const errors = state.fieldErrors ?? {};
  const draftKey = `car-new:${lookup.regNumber}`;
  useFormDraft(editing ? draftKey : null, formRef, () => toast.show({ tone: "info", message: t.common.draftRestored }));

  // Manual entry starts with an empty form, so put the cursor in it.
  useEffect(() => {
    if (editing) formRef.current?.querySelector<HTMLInputElement>("input[name=make]")?.focus();
  }, [editing]);

  function save(values: CarFormValues) {
    startTransition(async () => {
      try {
        // On success the action redirects, so a returned value means there's something to show.
        const result = (await createCar({ ...values, reg_number: lookup.regNumber, rc_raw: lookup.rcRaw })) ?? {};
        if (!result.formError && !result.fieldErrors) clearDraft(draftKey);
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
    <div className="flex flex-1 flex-col gap-6">
      <Card className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-small text-ink-muted">{t.cars.regNumber}</p>
          <Plate reg={lookup.regNumber} />
        </div>
        <Button variant="secondary" size="sm" onClick={onChangeReg} disabled={isPending} className="shrink-0">
          {t.cars.change}
        </Button>
      </Card>

      {lookup.existingCarId && (
        <Notice>
          {t.cars.duplicate}{" "}
          <Link href={`/app/cars/${lookup.existingCarId}`} className="font-semibold underline underline-offset-2">
            {t.cars.openExisting}
          </Link>
        </Notice>
      )}
      {notice && <Notice>{notice}</Notice>}

      {!editing ? (
        <RcSummary values={lookup.values} pending={isPending} onConfirm={() => save(lookup.values)} onEdit={() => setEditing(true)} error={state.formError} />
      ) : (
        <form
          ref={formRef}
          onSubmit={onSubmit}
          onInput={(e) => clearFieldError((e.target as HTMLInputElement).name)}
          className="flex flex-1 flex-col gap-6"
          noValidate
        >
          <Card className="flex flex-col gap-6">
            <CarFields values={lookup.values} errors={errors} />
          </Card>
          <FormError message={state.formError} />
          <StickyBar>
            <Button type="submit" loading={isPending}>
              {isPending ? t.cars.saving : t.cars.save}
            </Button>
          </StickyBar>
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
    <>
      <Card className="flex animate-rise-in flex-col gap-4">
        <p className="flex items-center gap-2 text-small font-semibold text-success-700">
          <span className="flex size-6 items-center justify-center rounded-full bg-success-50">
            <CheckIcon size={16} />
          </span>
          {t.cars.foundShort}
        </p>
        <div className="flex flex-col gap-1">
          <p className="text-title">{title}</p>
          {facts.length > 0 && <p className="text-ink-muted">{facts.join(" · ")}</p>}
          {values.insurance_valid_upto && (
            <p className="text-small text-ink-muted">
              {t.cars.insurance}: {formatDate(values.insurance_valid_upto)}
            </p>
          )}
        </div>
      </Card>
      <FormError message={error} />
      <StickyBar>
        <Button onClick={onConfirm} loading={pending} icon={<CheckIcon size={20} />}>
          {pending ? t.cars.saving : t.cars.looksRight}
        </Button>
        <Button variant="ghost" onClick={onEdit} disabled={pending} icon={<PencilIcon size={18} />}>
          {t.cars.editFound}
        </Button>
      </StickyBar>
    </>
  );
}
