import { REPORT } from "@/lib/config";

// 32 characters with no 0/o or 1/l, so a link read out over the phone can't be mistyped.
// 256 is a multiple of 32, so taking a byte modulo 32 picks every character equally often.
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";

/** A random, unguessable slug for a public report link, e.g. "k7m2p9xa4c". */
export function generateSlug(length: number = REPORT.slugLength) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Matches the reports_slug_format check in the database. */
export function isValidSlug(value: string) {
  return /^[a-z0-9]{8,32}$/.test(value);
}
