// Shared car vocabulary. Values are stored in the database; labels live in lib/strings.ts.

export const FUELS = ["petrol", "diesel", "cng", "petrol_cng", "electric", "hybrid", "lpg"] as const;
export type Fuel = (typeof FUELS)[number];

export const TRANSMISSIONS = ["manual", "automatic"] as const;
export type Transmission = (typeof TRANSMISSIONS)[number];

export const MIN_CAR_YEAR = 1980;
export const MAX_OWNERS = 15;

/** Latest model year we accept: next year's models are often sold late in the current year. */
export function maxCarYear(now = new Date()) {
  return now.getFullYear() + 1;
}

/** Maps the free-text fuel an RC provider returns ("PETROL/CNG", "ELECTRIC(BOV)") to our keys. */
export function normaliseFuel(raw: string | null | undefined): Fuel | null {
  if (!raw) return null;
  const s = raw.toUpperCase();
  if (s.includes("ELECTRIC") && !s.includes("HYBRID")) return "electric";
  if (s.includes("HYBRID")) return "hybrid";
  if (s.includes("CNG")) return s.includes("PETROL") ? "petrol_cng" : "cng";
  if (s.includes("LPG")) return "lpg";
  if (s.includes("DIESEL")) return "diesel";
  if (s.includes("PETROL")) return "petrol";
  return null;
}

export function normaliseTransmission(raw: string | null | undefined): Transmission | null {
  if (!raw) return null;
  const s = raw.toUpperCase();
  if (/\b(AUTO|AUTOMATIC|AT|AMT|CVT|DCT|DSG|IVT)\b/.test(s)) return "automatic";
  if (/\b(MANUAL|MT)\b/.test(s)) return "manual";
  return null;
}

export const isFuel = (v: string | null): v is Fuel => (FUELS as readonly string[]).includes(v ?? "");
export const isTransmission = (v: string | null): v is Transmission => (TRANSMISSIONS as readonly string[]).includes(v ?? "");
