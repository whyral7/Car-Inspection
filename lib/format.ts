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
