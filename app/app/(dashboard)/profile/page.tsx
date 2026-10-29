import type { Metadata } from "next";
import { LinkButton } from "@/components/button";
import { FREE_CREDITS } from "@/lib/config";
import { buildCreditHistory, totalBought, totalUsed, type CreditEntry } from "@/lib/credits/history";
import { carTitle, formatDateTime, formatRupees } from "@/lib/format";
import { displayName, getCurrentProfile } from "@/lib/profile";
import { formatPhone } from "@/lib/report/share";
import { logoUrl } from "@/lib/storage";
import { t } from "@/lib/strings";

export const metadata: Metadata = { title: t.profile.title };

function entryLabel(entry: CreditEntry) {
  switch (entry.kind) {
    case "welcome":
      return t.profile.entry.welcome;
    case "purchase":
      return t.profile.entry.purchase(formatRupees(entry.amountPaise));
    case "report":
      return t.profile.entry.report(entry.carLabel);
  }
}

export default async function ProfilePage() {
  const { supabase, profile } = await getCurrentProfile();
  // RLS limits both to this dealer's rows.
  const [paymentsRes, reportsRes, carsRes] = await Promise.all([
    supabase
      .from("payments")
      .select("status, credits, amount_paise, paid_at, created_at, razorpay_payment_id")
      .eq("status", "paid")
      .order("created_at", { ascending: false }),
    supabase.from("reports").select("car_id, published_at").not("published_at", "is", null),
    supabase.from("cars").select("id, reg_number, year, make, model"),
  ]);
  if (paymentsRes.error) throw paymentsRes.error;
  if (reportsRes.error) throw reportsRes.error;
  if (carsRes.error) throw carsRes.error;

  const cars = new Map(carsRes.data.map((c) => [c.id, c]));
  const history = buildCreditHistory({
    dealerCreatedAt: profile.created_at,
    freeCredits: FREE_CREDITS,
    payments: paymentsRes.data,
    reports: reportsRes.data.map((r) => {
      const car = cars.get(r.car_id);
      return { published_at: r.published_at, carLabel: car ? [car.reg_number, carTitle(car)].filter(Boolean).join(" · ") : "" };
    }),
  });

  const isDealer = profile.user_type === "dealer";
  const logo = isDealer ? logoUrl(profile.logo_path) : null;
  const name = displayName(profile);
  const phone = formatPhone(profile.phone);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- small public logo, no need for the image optimiser
            <img src={logo} alt="" className="size-14 shrink-0 rounded-xl border border-slate-200 object-contain" />
          ) : (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{name}</h1>
            {profile.city && <p className="text-slate-600">{profile.city}</p>}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {profile.user_type && (
            <>
              <dt className="text-slate-500">{t.profile.userType}</dt>
              <dd>{t.onboarding.userTypes[profile.user_type]}</dd>
            </>
          )}
          {profile.owner_name && profile.owner_name !== name && (
            <>
              <dt className="text-slate-500">{t.profile.owner}</dt>
              <dd>{profile.owner_name}</dd>
            </>
          )}
          {phone && (
            <>
              <dt className="text-slate-500">{t.profile.phone}</dt>
              <dd>{phone}</dd>
            </>
          )}
          {isDealer && profile.address && (
            <>
              <dt className="text-slate-500">{t.profile.address}</dt>
              <dd className="whitespace-pre-line">{profile.address}</dd>
            </>
          )}
        </dl>
        <LinkButton href="/app/onboarding" variant="secondary" className="mt-4 w-full">
          {t.profile.edit}
        </LinkButton>
      </section>

      <section className="rounded-2xl bg-brand-700 p-5 text-white">
        <p className="text-sm text-brand-100">{t.profile.creditsTitle}</p>
        <p className="text-3xl font-bold">{t.profile.balance(profile.credits)}</p>
        <p className="mt-1 text-sm text-brand-100">
          {t.profile.bought(totalBought(history))} · {t.profile.used(totalUsed(history))}
        </p>
        <LinkButton href="/app/credits" variant="secondary" className="mt-4 w-full border-white">
          {t.profile.buy}
        </LinkButton>
      </section>

      <section id="history" className="scroll-mt-20">
        <h2 className="mb-3 text-lg font-bold">{t.profile.historyTitle}</h2>
        {history.length === 0 ? (
          <p className="text-slate-600">{t.profile.historyEmpty}</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {history.map((entry, i) => (
              <li key={i} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium break-words">{entryLabel(entry)}</p>
                  <p className="text-sm text-slate-500">{formatDateTime(entry.at)}</p>
                  {entry.kind === "purchase" && entry.paymentId && <p className="text-xs break-all text-slate-400">{t.profile.paymentId(entry.paymentId)}</p>}
                </div>
                <span className={`shrink-0 font-bold tabular-nums ${entry.change > 0 ? "text-emerald-700" : "text-slate-700"}`}>
                  {entry.change > 0 ? `+${entry.change}` : entry.change}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-slate-500">{t.profile.help}</p>
      </section>
    </div>
  );
}
