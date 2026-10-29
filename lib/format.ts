const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const plainDateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** A timestamp shown in Indian time, e.g. "19 Oct 2026". */
export function formatDateTime(iso: string) {
  return dateFormat.format(new Date(iso));
}

/** A calendar date (YYYY-MM-DD) with no time zone shift. */
export function formatDate(isoDate: string) {
  return plainDateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

/** True if a YYYY-MM-DD date is before today in India. */
export function isPastDate(isoDate: string, now = new Date()) {
  const todayInIndia = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
  return isoDate < todayInIndia;
}

export function carTitle(car: { year: number | null; make: string | null; model: string | null; variant?: string | null }) {
  return [car.year, car.make, car.model, car.variant].filter(Boolean).join(" ");
}

const rupeeFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const rupeePaiseFormat = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Rupees with Indian grouping, without the symbol: 249900 -> "2,499", 8330 -> "83.30". */
export function formatRupees(paise: number) {
  return paise % 100 === 0 ? rupeeFormat.format(paise / 100) : rupeePaiseFormat.format(paise / 100);
}

/**
 * Rupees the way Indian car buyers read prices: "₹4.6 lakh", "₹12.5 lakh", "₹1.25 crore",
 * and plain "₹85,000" under a lakh.
 */
export function formatInrShort(rupees: number) {
  if (rupees >= 10_000_000) return `₹${trimZeros((rupees / 10_000_000).toFixed(2))} crore`;
  if (rupees >= 100_000) return `₹${trimZeros((rupees / 100_000).toFixed(rupees < 1_000_000 ? 2 : 1))} lakh`;
  return `₹${rupeeFormat.format(rupees)}`;
}

function trimZeros(n: string) {
  return n.replace(/\.?0+$/, "");
}
