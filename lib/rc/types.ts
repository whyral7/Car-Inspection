import type { Fuel, Transmission } from "@/lib/cars";

/** Car details from the registration certificate. Any field the provider doesn't give is null. */
export type RcDetails = {
  make: string | null;
  model: string | null;
  variant: string | null;
  fuel: Fuel | null;
  transmission: Transmission | null;
  year: number | null;
  owners: number | null;
  /** ISO date, YYYY-MM-DD. */
  insurance_valid_upto: string | null;
  /** The provider's full response, kept on the car as rc_raw. */
  raw: Record<string, unknown>;
};

export interface RcProvider {
  readonly name: string;
  /** Resolves to null when the provider has no record for this number. Throws on network or provider errors. */
  lookup(regNumber: string): Promise<RcDetails | null>;
}

export type RcLookupResult =
  | { status: "found"; provider: string; details: RcDetails }
  | { status: "not_found" }
  /** No provider configured, missing key, or the provider failed. The dealer enters details by hand. */
  | { status: "unavailable" };
