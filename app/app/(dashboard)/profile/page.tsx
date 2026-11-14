import type { Metadata } from "next";
import { FlashToast } from "@/components/flash-toast";
import { ClockIcon, CreditIcon, PencilIcon } from "@/components/icons";
import { LanguageToggle } from "@/components/language-toggle";
import { SignOut } from "@/components/sign-out";
import { BackLink, Card, EmptyState, LinkButton, ListCard, ListRow } from "@/components/ui";
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

  const facts = [
    profile.user_type && { label: t.profile.userType, value: t.onboarding.userTypes[profile.user_type] },
    profile.owner_name && profile.owner_name !== name && { label: t.profile.owner, value: profile.owner_name },
    phone && { label: t.profile.phone, value: phone },
    isDealer && profile.address && { label: t.profile.address, value: profile.address },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex flex-1 flex-col gap-8">
      <FlashToast param="saved" message={t.profile.saved} />
      <header className="flex flex-col gap-4">
        <BackLink href="/app">{t.car.backToCars}</BackLink>
        <div className="flex items-center gap-4">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- small public logo, no need for the image optimiser
            <img src={logo} alt="" className="size-16 shrink-0 rounded-card bg-surface object-contain shadow-card ring-1 ring-line" />
          ) : (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-card bg-brand-700 text-title text-white">{name.charAt(0).toUpperCase()}</span>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-title break-words">{name}</h1>
            {profile.city && <p className="text-ink-muted">{profile.city}</p>}
          </div>
        </div>
      </header>

      <section aria-labelledby="account-title" className="flex flex-col gap-2">
        <h2 id="account-title" className="px-1 text-heading">
          {t.profile.title}
        </h2>
        <ListCard>
          {facts.map((f) => (
            <ListRow key={f.label} title={<span className="text-small font-normal text-ink-muted">{f.label}</span>} subtitle={<span className="whitespace-pre-line text-body text-ink">{f.value}</span>} />
          ))}
          <ListRow href="/app/onboarding" leading={<PencilIcon size={20} className="text-brand-700" />} title={<span className="text-brand-700">{t.profile.edit}</span>} />
        </ListCard>
      </section>

      <Card as="section" className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <CreditIcon />
          </span>
          <div className="flex flex-col">
            <p className="text-small text-ink-muted">{t.profile.creditsTitle}</p>
            <p className="text-title tabular">{t.profile.balance(profile.credits)}</p>
          </div>
        </div>
        <p className="text-small text-ink-muted tabular">
          {t.profile.bought(totalBought(history))} · {t.profile.used(totalUsed(history))}
        </p>
        <LinkButton href="/app/credits" size="sm">
          {t.profile.buy}
        </LinkButton>
      </Card>

      <Card as="section" className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-semibold">{t.common.language}</h2>
        <LanguageToggle />
      </Card>

      <section id="history" aria-labelledby="history-title" className="flex scroll-mt-24 flex-col gap-2">
        <h2 id="history-title" className="px-1 text-heading">
          {t.profile.historyTitle}
        </h2>
        {history.length === 0 ? (
          <EmptyState icon={<ClockIcon size={24} />} title={t.profile.historyEmpty} />
        ) : (
          <ListCard>
            {history.map((entry, i) => (
              <ListRow
                key={i}
                title={<span className="break-words">{entryLabel(t, entry)}</span>}
                subtitle={
                  <>
                    {formatDateTime(entry.at)}
                    {entry.kind === "purchase" && entry.paymentId && <span className="block text-caption break-all">{t.profile.paymentId(entry.paymentId)}</span>}
                  </>
                }
                trailing={
                  <span className={`shrink-0 font-semibold tabular ${entry.change > 0 ? "text-success-700" : "text-ink-muted"}`}>
                    {entry.change > 0 ? `+${entry.change}` : entry.change}
                  </span>
                }
              />
            ))}
          </ListCard>
        )}
        <p className="px-1 text-small text-ink-muted">{t.profile.help}</p>
      </section>

      <section className="flex flex-col gap-2">
        <SignOut />
        <a
          href={deleteHref}
          className="inline-flex min-h-11 items-center justify-center self-center rounded-chip px-2 text-small font-semibold text-danger-700 transition-colors hover:bg-danger-50"
          {...(deleteHref.startsWith("https:") ? { target: "_blank", rel: "noopener" } : {})}
        >
          {t.profile.deleteAccount}
        </a>
        <p className="text-center text-caption text-ink-muted">{t.profile.deleteAccountHint}</p>
      </section>
    </div>
  );
}
