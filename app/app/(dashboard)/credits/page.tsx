import type { Metadata } from "next";
import Link from "next/link";
import { CREDIT_PACKS } from "@/lib/config";
import { pricePerReportPaise } from "@/lib/credits/packs";
import { getCurrentDealer } from "@/lib/dealer";
import { t } from "@/lib/strings";
import { safeNextPath } from "@/lib/validation/auth";
import { BuyCredits } from "./buy-credits";

export const metadata: Metadata = { title: t.credits.title };

// Packs and prices come from CREDIT_PACKS in lib/config.ts. ?next=/app/... sends the dealer back
// (e.g. to the report they were about to publish) after paying.
export default async function CreditsPage({ searchParams }: PageProps<"/app/credits">) {
  const { dealer } = await getCurrentDealer();
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/app/") ? safeNextPath(next) : null;

  const cheapest = Math.min(...CREDIT_PACKS.map(pricePerReportPaise));
  const packs = CREDIT_PACKS.map((pack) => ({
    key: pack.key,
    credits: pack.credits,
    pricePaise: pack.pricePaise,
    perReportPaise: pricePerReportPaise(pack),
    best: CREDIT_PACKS.length > 1 && pricePerReportPaise(pack) === cheapest,
  }));

  return (
    <div className="flex flex-col gap-4">
      <Link href={nextPath ?? "/app"} className="-ml-1 inline-flex min-h-11 items-center self-start px-1 text-sm font-medium text-brand-700">
        ← {t.credits.back}
      </Link>
      <header>
        <h1 className="text-xl font-bold">{t.credits.title}</h1>
        <p className="text-sm text-slate-600">{t.credits.subtitle}</p>
        <p className="mt-2 font-medium">{t.credits.balance(dealer.credits)}</p>
      </header>
      <BuyCredits packs={packs} next={nextPath} />
      <Link href="/app/profile#history" className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-brand-700">
        {t.credits.history}
      </Link>
    </div>
  );
}
