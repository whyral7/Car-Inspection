import { CreditIcon } from "@/components/icons";
import type { Strings } from "@/lib/strings";

/** Credits left, as a quiet mono reading: it is a count, not a rating, so it takes no rating colour. */
export function CreditsBadge({ credits, t }: { credits: number; t: Strings }) {
  return (
    <span aria-label={t.dashboard.creditsLeft(credits)} className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-sm bg-surface-sunken px-2.5 type-code-strong text-text">
      <CreditIcon size={16} />
      {t.dashboard.creditsShort(credits)}
    </span>
  );
}
