import { normaliseFuel, normaliseTransmission } from "@/lib/cars";
import type { RcDetails, RcProvider } from "./types";

// Stub for Surepass "RC Full" (https://surepass.io). Field names follow their published response;
// check them against a real sandbox response before going live. Any failure falls back to manual entry.
const ENDPOINT = "https://kyc-api.surepass.io/api/v1/rc/rc-full";
const TIMEOUT_MS = 10_000;

const COMPANY_NOISE = /\b(INDIA|PVT|PRIVATE|LTD|LIMITED|CO|COMPANY|MOTORS?|CARS|AUTOMOBILES?|KIRLOSKAR)\b\.?/g;

/** "MARUTI SUZUKI INDIA LTD" becomes "Maruti Suzuki". */
export function cleanMakerName(raw: string) {
  return raw
    .toUpperCase()
    .replace(COMPANY_NOISE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^|[\s&-])\w/g, (c) => c.toUpperCase());
}

/** Accepts YYYY-MM-DD, DD-MM-YYYY or DD/MM/YYYY and returns YYYY-MM-DD. */
export function toIsoDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function yearFrom(...values: unknown[]): number | null {
  for (const v of values) {
    const m = typeof v === "string" ? /\b(19[89]\d|20\d{2})\b/.exec(v) : null;
    if (m) return Number(m[1]);
  }
  return null;
}

function str(v: unknown) {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Maps Surepass's `data` object to our RC shape. Exported for tests. */
export function mapSurepassData(data: Record<string, unknown>): RcDetails {
  const maker = str(data.maker_description);
  const owners = Number(data.owner_number);
  return {
    make: maker ? cleanMakerName(maker) : null,
    // RC data puts model and variant in one field ("SWIFT VXI"); the dealer splits it if they care.
    model: str(data.maker_model),
    variant: null,
    fuel: normaliseFuel(str(data.fuel_type)),
    // RCs don't record the gearbox; sometimes the model name gives it away ("CITY VX CVT").
    transmission: normaliseTransmission(str(data.maker_model)),
    year: yearFrom(data.manufacturing_date_formatted, data.manufacturing_date, data.registration_date),
    owners: Number.isInteger(owners) && owners > 0 ? owners : null,
    insurance_valid_upto: toIsoDate(data.insurance_upto),
    raw: { source: "surepass", ...data },
  };
}

export function createSurepassProvider(apiKey: string): RcProvider {
  return {
    name: "surepass",
    async lookup(regNumber) {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ id_number: regNumber }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      // Surepass answers 422/404 when the number isn't on record.
      if (res.status === 404 || res.status === 422) return null;
      if (!res.ok) throw new Error(`Surepass RC lookup failed with HTTP ${res.status}`);

      const body = (await res.json()) as { success?: boolean; data?: unknown };
      if (!body.success || !body.data || typeof body.data !== "object") return null;
      return mapSurepassData(body.data as Record<string, unknown>);
    },
  };
}
