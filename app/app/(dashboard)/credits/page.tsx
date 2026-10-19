import type { Metadata } from "next";
import Link from "next/link";
import { CREDIT_PACKS } from "@/lib/config";
import { getCurrentDealer } from "@/lib/dealer";
import { t } from "@/lib/strings";

export const metadata: Metadata = { title: t.credits.title };

const rupees = (paise: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(paise / 100);

// Packs and prices from lib/config.ts. Razorpay checkout is added in Phase 6.
export default async function CreditsPage() {
  const { dealer } = await getCurrentDealer();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/app" className="-ml-1 inline-flex min-h-11 items-center self-start px-1 text-sm font-medium text-brand-700">
        ← {t.credits.back}
      </Link>
      <header>
        <h1 className="text-xl font-bold">{t.credits.title}</h1>
        <p className="text-sm text-slate-600">{t.credits.subtitle}</p>
        <p className="mt-2 font-medium">{t.credits.balance(dealer.credits)}</p>
      </header>
      <ul className="flex flex-col gap-3">
        {CREDIT_PACKS.map((pack) => (
          <li key={pack.key} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <p className="text-lg font-bold">{t.credits.pack(pack.credits)}</p>
              <p className="text-sm text-slate-500">{t.credits.perReport(rupees(Math.round(pack.pricePaise / pack.credits)))}</p>
            </div>
            <p className="text-xl font-bold">₹{rupees(pack.pricePaise)}</p>
          </li>
        ))}
      </ul>
      <p className="rounded-2xl bg-amber-50 p-4 text-center text-sm font-medium text-amber-900">{t.credits.comingSoon}</p>
    </div>
  );
}
