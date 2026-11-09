import { getT } from "@/lib/i18n.server";

export async function CreditsBadge({ credits }: { credits: number }) {
  const t = await getT();
  const low = credits <= 1;
  return (
    <span
      aria-label={t.dashboard.creditsLeft(credits)}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-sm px-2 py-1 font-mono text-xs font-medium ${
        low ? "bg-attention-tint text-attention" : "bg-accent-tint text-accent"
      }`}
    >
      {t.dashboard.creditsShort(credits)}
    </span>
  );
}
