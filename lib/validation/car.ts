import { z } from "zod";
import { FUELS, MAX_OWNERS, MIN_CAR_YEAR, TRANSMISSIONS, maxCarYear } from "@/lib/cars";

// Error messages are keys into lib/strings.ts ("cars.errors.make"); show them with errorText() from lib/i18n.

// RTO state and union territory codes, including old ones still on the road (OR, UA, DD, DN).
const STATE_CODES = new Set([
  "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", "GA", "GJ", "HP", "HR", "JH", "JK", "KA", "KL",
  "LA", "LD", "MH", "ML", "MN", "MP", "MZ", "NL", "OD", "OR", "PB", "PY", "RJ", "SK", "TG", "TN", "TR", "TS",
  "UA", "UK", "UP", "WB",
]);

// MH12AB1234, DL3CAB1234, KA019999 (no series), MH12A1. Number part is 1-4 digits, not all zeros.
const STANDARD = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/;
// Bharat series: YY BH #### XX, e.g. 22BH1234AA. Introduced in 2021.
const BH_SERIES = /^(\d{2})BH(\d{4})([A-Z]{1,2})$/;

/** Uppercase and drop spaces, hyphens and dots: "mh 12-ab 1234" becomes "MH12AB1234". */
export function normaliseRegNumber(raw: string) {
  return raw.toUpperCase().replace(/[\s\-.]/g, "");
}

export function isValidRegNumber(reg: string, now = new Date()) {
  const std = STANDARD.exec(reg);
  if (std) return STATE_CODES.has(std[1]) && Number(std[2]) > 0 && Number(std[4]) > 0;
  const bh = BH_SERIES.exec(reg);
  if (bh) {
    const yy = Number(bh[1]);
    return yy >= 21 && yy <= (now.getFullYear() % 100) + 1 && Number(bh[2]) > 0;
  }
  return false;
}

export function isBhSeries(reg: string) {
  return BH_SERIES.test(reg);
}

export const regNumberSchema = z
  .string("cars.errors.regNumber")
  .transform(normaliseRegNumber)
  .refine((reg) => isValidRegNumber(reg), "cars.errors.regNumber");

const blankToNull = (v: unknown) => (typeof v === "string" ? v.trim() || null : (v ?? null));

const optionalText = (max: number, message: string) =>
  z.preprocess(blankToNull, z.string(message).max(max, message).nullable());

const requiredText = (max: number, message: string) => z.string(message).trim().min(1, message).max(max, message);

const optionalInt = (min: number, max: () => number, message: string) =>
  z.preprocess(
    (v) => {
      const b = blankToNull(v);
      return b === null ? null : Number(b);
    },
    z
      .number(message)
      .int(message)
      .min(min, message)
      .refine((n) => n <= max(), message)
      .nullable(),
  );

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.preprocess(blankToNull, z.enum(values, message).nullable());

/** RC payloads are small; cap what we store so a bad client can't bloat the row. */
const MAX_RC_RAW_CHARS = 20_000;

export const carDetailsSchema = z.object({
  make: requiredText(60, "cars.errors.make"),
  model: requiredText(60, "cars.errors.model"),
  variant: optionalText(60, "cars.errors.variant"),
  fuel: optionalEnum(FUELS, "cars.errors.fuel"),
  transmission: optionalEnum(TRANSMISSIONS, "cars.errors.transmission"),
  year: z.preprocess(
    (v) => {
      const b = blankToNull(v);
      return b === null ? undefined : Number(b);
    },
    z
      .number("cars.errors.year")
      .int("cars.errors.year")
      .min(MIN_CAR_YEAR, "cars.errors.year")
      .refine((y) => y <= maxCarYear(), "cars.errors.year"),
  ),
  owners: optionalInt(1, () => MAX_OWNERS, "cars.errors.owners"),
  insurance_valid_upto: z.preprocess(blankToNull, z.iso.date("cars.errors.insurance").nullable()),
});

export const newCarSchema = carDetailsSchema.extend({
  reg_number: regNumberSchema,
  rc_raw: z
    .record(z.string(), z.unknown())
    .nullable()
    .default(null)
    .refine((raw) => raw === null || JSON.stringify(raw).length <= MAX_RC_RAW_CHARS, "common.somethingWrong"),
});

export type CarDetailsInput = z.input<typeof carDetailsSchema>;
export type NewCarInput = z.infer<typeof newCarSchema>;
export type NewCarField = keyof NewCarInput;
