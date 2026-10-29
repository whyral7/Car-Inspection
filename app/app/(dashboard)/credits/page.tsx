import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CreditIcon } from "@/components/icons";
import { PageHeader } from "@/components/ui";
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
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader back={{ href: nextPath ?? "/app", label: t.credits.back }} title={t.credits.title} description={t.credits.subtitle} />
      {/* The balance, like a wallet card. */}
      <section aria-label={t.dashboard.credits} className="flex items-start justify-between gap-4 rounded-card bg-brand-800 p-6 text-white shadow-raised">
        <div className="flex flex-col gap-1">
          <p className="text-caption font-semibold tracking-wide text-brand-100 uppercase">{t.dashboard.credits}</p>
          <p className="text-display tabular">{profile.credits}</p>
          <p className="text-small text-brand-100">{t.dashboard.creditsHint}</p>
          <Link
            href="/app/profile#history"
            className="-mx-2 mt-2 inline-flex min-h-11 items-center gap-2 self-start rounded-chip px-2 text-small font-semibold text-white transition-colors hover:bg-white/10"
          >
            {t.credits.history}
            <ArrowRightIcon size={16} />
          </Link>
        </div>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10">
          <CreditIcon size={24} />
        </span>
      </section>
      <BuyCredits packs={packs} next={nextPath} supportHref={supportWhatsappHref()} />
    </div>
  );
}
