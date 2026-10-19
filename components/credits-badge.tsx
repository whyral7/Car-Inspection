import { t } from "@/lib/strings";

export function CreditsBadge({ credits }: { credits: number }) {
  const low = credits <= 1;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
        low ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-800"
      }`}
    >
      {t.dashboard.creditsLeft(credits)}
    </span>
  );
}
