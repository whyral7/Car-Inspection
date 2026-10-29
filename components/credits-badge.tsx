import type { Strings } from "@/lib/strings";

export function CreditsBadge({ credits, t }: { credits: number; t: Strings }) {
  const low = credits <= 1;
  return (
    <span
      aria-label={t.dashboard.creditsLeft(credits)}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        low ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-800"
      }`}
    >
      {t.dashboard.creditsShort(credits)}
    </span>
  );
}
