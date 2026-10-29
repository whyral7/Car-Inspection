import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/ui";
import { CreditIcon } from "@/components/icons";
import { supportWhatsappHref } from "@/lib/site";
import { CREDIT_PACKS } from "@/lib/config";
import { pricePerReportPaise } from "@/lib/credits/packs";
import { getCurrentProfile } from "@/lib/profile";
import { getT } from "@/lib/i18n.server";
import { safeNextPath } from "@/lib/validation/auth";
import { BuyCredits } from "./buy-credits";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.credits.title };
}

// Packs and prices come from CREDIT_PACKS in lib/config.ts. ?next=/app/... sends the dealer back
// (e.g. to the report they were about to publish) after paying.
export default async function CreditsPage({ searchParams }: PageProps<"/app/credits">) {
  const t = await getT();
  const { profile } = await getCurrentProfile();
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
      <BackLink href={nextPath ?? "/app"}>{t.credits.back}</BackLink>
      <header>
        <h1 className="text-title font-bold">{t.credits.title}</h1>
        <p className="text-small text-ink-muted">{t.credits.subtitle}</p>
        <p className={`mt-3 inline-flex items-center gap-2 rounded-control px-3 py-2 font-semibold ${profile.credits < 1 ? "bg-warning-50 text-warning-800" : "bg-brand-50 text-brand-900"}`}>
          <CreditIcon size={18} />
          {t.credits.balance(profile.credits)}
        </p>
      </header>
      <BuyCredits packs={packs} next={nextPath} supportHref={supportWhatsappHref()} />
      <Link href="/app/profile#history" className="inline-flex min-h-11 items-center justify-center text-small font-medium text-brand-700">
        {t.credits.history}
      </Link>
    </div>
  );
}
