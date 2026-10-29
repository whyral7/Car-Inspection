import type { Metadata } from "next";
import { LinkButton } from "@/components/ui";
import { CreditIcon } from "@/components/icons";
import { LanguageToggle } from "@/components/language-toggle";
import { SignOut } from "@/components/sign-out";
import { accountDeletionHref } from "@/lib/site";
import { FREE_CREDITS } from "@/lib/config";
import { buildCreditHistory, totalBought, totalUsed, type CreditEntry } from "@/lib/credits/history";
import { carTitle, formatDateTime, formatRupees } from "@/lib/format";
import { displayName, getCurrentProfile } from "@/lib/profile";
import { formatPhone } from "@/lib/report/share";
import { logoUrl } from "@/lib/storage";
import { getT } from "@/lib/i18n.server";
import type { Strings } from "@/lib/strings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.profile.title };
}

function entryLabel(t: Strings, entry: CreditEntry) {
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
  const t = await getT();
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
  const deleteHref = accountDeletionHref(t.profile.deleteAccountMessage(phone ?? ""));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-card border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- small public logo, no need for the image optimiser
            <img src={logo} alt="" className="size-14 shrink-0 rounded-control border border-line object-contain" />
          ) : (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-control bg-brand-700 text-title font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-title font-bold break-words">{name}</h1>
            {profile.city && <p className="text-ink-muted">{profile.city}</p>}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-small">
          {profile.user_type && (
            <>
              <dt className="text-ink-muted">{t.profile.userType}</dt>
              <dd>{t.onboarding.userTypes[profile.user_type]}</dd>
            </>
          )}
          {profile.owner_name && profile.owner_name !== name && (
            <>
              <dt className="text-ink-muted">{t.profile.owner}</dt>
              <dd>{profile.owner_name}</dd>
            </>
          )}
          {phone && (
            <>
              <dt className="text-ink-muted">{t.profile.phone}</dt>
              <dd>{phone}</dd>
            </>
          )}
          {isDealer && profile.address && (
            <>
              <dt className="text-ink-muted">{t.profile.address}</dt>
              <dd className="whitespace-pre-line">{profile.address}</dd>
            </>
          )}
        </dl>
        <LinkButton href="/app/onboarding" variant="secondary" className="mt-4 w-full">
          {t.profile.edit}
        </LinkButton>
      </section>

      <section className="rounded-card border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-700">
            <CreditIcon />
          </span>
          <div>
            <p className="text-small text-ink-muted">{t.profile.creditsTitle}</p>
            <p className="text-title font-bold">{t.profile.balance(profile.credits)}</p>
          </div>
        </div>
        <p className="mt-2 text-small text-ink-muted">
          {t.profile.bought(totalBought(history))} · {t.profile.used(totalUsed(history))}
        </p>
        <LinkButton href="/app/credits" className="mt-3 w-full">
          {t.profile.buy}
        </LinkButton>
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        <h2 className="font-semibold">{t.common.language}</h2>
        <LanguageToggle className="self-start" />
      </section>

      <section id="history" className="scroll-mt-20">
        <h2 className="mb-3 text-heading font-bold">{t.profile.historyTitle}</h2>
        {history.length === 0 ? (
          <p className="text-ink-muted">{t.profile.historyEmpty}</p>
        ) : (
          <ul className="divide-y divide-line rounded-card border border-line bg-surface">
            {history.map((entry, i) => (
              <li key={i} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium break-words">{entryLabel(t, entry)}</p>
                  <p className="text-small text-ink-muted">{formatDateTime(entry.at)}</p>
                  {entry.kind === "purchase" && entry.paymentId && <p className="text-caption break-all text-ink-muted">{t.profile.paymentId(entry.paymentId)}</p>}
                </div>
                <span className={`shrink-0 font-bold tabular-nums ${entry.change > 0 ? "text-success-700" : "text-ink-muted"}`}>
                  {entry.change > 0 ? `+${entry.change}` : entry.change}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-small text-ink-muted">{t.profile.help}</p>
      </section>

      <section className="flex flex-col gap-3">
        <SignOut />
        <a href={deleteHref} className="inline-flex min-h-11 items-center justify-center text-small font-semibold text-danger-700" {...(deleteHref.startsWith("https:") ? { target: "_blank", rel: "noopener" } : {})}>
          {t.profile.deleteAccount}
        </a>
        <p className="text-center text-caption text-ink-muted">{t.profile.deleteAccountHint}</p>
      </section>
    </div>
  );
}
