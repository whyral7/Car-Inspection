import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ChatIcon, CheckIcon, ChevronDownIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { Plate } from "@/components/plate";
import { ScoreMeter } from "@/components/score-meter";
import { Badge, LinkButton, buttonClass, cardClass } from "@/components/ui";
import { CHECKLIST_KEYS } from "@/lib/checklist";
import { APP_NAME, BUSINESS, CREDIT_PACKS, FREE_CREDITS, SAMPLE_REPORT_PATH } from "@/lib/config";
import { ANGLES, ANGLE_KEYS } from "@/lib/photos/angles";
import { maskReg } from "@/lib/report/view";
import { pricePerReportPaise } from "@/lib/credits/packs";
import { formatRupees } from "@/lib/format";
import { supportWhatsappHref } from "@/lib/site";
import { getT } from "@/lib/i18n.server";
import { en, type Strings } from "@/lib/strings";

type Home = Strings["home"];

const PHOTOS = ANGLES.length;
const CHECKS = CHECKLIST_KEYS.length;
const META_DESCRIPTION = en.home.metaDescription(PHOTOS, FREE_CREDITS);

// Search engines and link previews get the English title and description.
export const metadata: Metadata = {
  title: { absolute: en.home.metaTitle },
  description: META_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: en.home.metaTitle, description: META_DESCRIPTION, url: "/" },
  twitter: { title: en.home.metaTitle, description: META_DESCRIPTION },
};

/** "Chat on WhatsApp". Only shown once BUSINESS.whatsapp is set, so it never leads to a placeholder page. */
function WhatsappLink({ h, className }: { h: Home; className: string }) {
  if (!BUSINESS.whatsapp) return null;
  return (
    <a href={supportWhatsappHref()} className={className} target="_blank" rel="noopener">
      <ChatIcon size={18} />
      {h.whatsapp}
    </a>
  );
}

/** A small static picture of a report, so visitors see what buyers get before tapping the sample. */
function ReportPreview({ h }: { h: Home }) {
  const p = h.preview;
  const score = Number(p.score);
  return (
    <div aria-hidden className="mx-auto w-full max-w-xs overflow-hidden rounded-lg bg-report-bg shadow-bar">
      <div className="flex items-center justify-between gap-2 border-b border-report-divider px-4 py-3">
        <Logo height={20} />
        <span className="type-code-sm text-report-id">{p.city}</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div>
          <p className="type-caption text-report-facts">{p.dealer}</p>
          <p className="type-title-sm">{p.car}</p>
          <Plate reg={maskReg(p.reg)} size="sm" className="mt-1.5" />
        </div>
        <ScoreMeter score={score} scoreText={p.score} outOf={p.outOf} grade={p.grade} label="" />
        <div className="grid grid-cols-4 gap-1">
          {ANGLE_KEYS.slice(0, 8).map((key) => (
            // eslint-disable-next-line @next/next/no-img-element -- tiny static drawings
            <img key={key} src={`/sample/${key}.svg`} alt="" width={80} height={60} className="aspect-[4/3] w-full rounded-sm bg-surface-sunken object-cover" />
          ))}
        </div>
        <ul className="flex flex-col gap-1 type-caption text-report-facts">
          {p.lines(PHOTOS, CHECKS).map((line) => (
            <li key={line} className="flex items-center gap-1.5">
              <CheckIcon size={14} className="text-text" />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default async function HomePage() {
  // In the visitor's language (the saved choice, else the phone's language), like the app.
  const t = await getT();
  const h = t.home;
  const cta = h.cta(FREE_CREDITS);
  const cheapest = Math.min(...CREDIT_PACKS.map(pricePerReportPaise));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Android, iOS, Web",
    description: h.metaDescription(PHOTOS, FREE_CREDITS),
    offers: CREDIT_PACKS.map((pack) => ({ "@type": "Offer", name: h.packTitle(pack.credits), price: pack.pricePaise / 100, priceCurrency: "INR" })),
  };
  const sectionTitle = "type-heading-1 text-balance";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Paper ground, ink type, one olive action. */}
      <section>
        <div className="mx-auto grid w-full max-w-5xl items-center gap-8 px-4 pt-8 pb-12 md:grid-cols-2 md:gap-12 md:pt-16 md:pb-16">
          <div className="flex flex-col gap-4 md:gap-6">
            <p className="caps type-overline text-text-muted">{h.eyebrow}</p>
            <h1 className="type-display-lg text-balance sm:type-display-xl">{h.headline}</h1>
            <p className="type-body-lg text-text-muted">{h.subhead(PHOTOS, CHECKS)}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <LinkButton href="/login" size="lg">
                {cta}
              </LinkButton>
              <LinkButton href={SAMPLE_REPORT_PATH} variant="secondary" size="lg">
                {h.sample}
              </LinkButton>
            </div>
            <p className="type-caption text-text-muted">{h.ctaNote}</p>
          </div>
          <ReportPreview h={h} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <h2 className={sectionTitle}>{h.stepsTitle}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {h.steps(PHOTOS).map((step, i) => (
            <li key={step.title} className={cardClass("default", "md", "flex gap-4 md:flex-col")}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-sunken type-reading text-text">{i + 1}</span>
              <div>
                <h3 className="type-title-sm">{step.title}</h3>
                <p className="mt-1 type-body-sm text-text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href={SAMPLE_REPORT_PATH} className="-mx-2 mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm px-2 type-label text-button-ghost-fg transition-colors hover:bg-button-ghost-bg-hover">
          {h.sample}
          <ArrowRightIcon size={16} />
        </Link>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto w-full max-w-5xl px-4 py-12">
          <h2 className={sectionTitle}>{h.whyTitle}</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {h.why.map((item) => (
              <li key={item.title} className="rounded-lg bg-bg p-4 sm:p-6">
                <h3 className="type-title-sm">{item.title}</h3>
                <p className="mt-1 type-body-sm text-text-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <h2 className={sectionTitle}>{h.faqTitle}</h2>
        <div className="mt-6 flex flex-col gap-2">
          {h.faq.map((item) => (
            <details key={item.q} className="group rounded-lg bg-surface shadow-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-4 py-3 type-title-sm transition-colors hover:bg-surface-sunken sm:px-6 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDownIcon size={20} className="shrink-0 text-text-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 type-body-sm text-text-muted sm:px-6">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-5xl scroll-mt-16 px-4 py-12">
        <h2 className={sectionTitle}>{h.pricingTitle}</h2>
        <p className="mt-2 type-body text-text-muted">{h.pricingSubtitle}</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          <li className={cardClass("default", "md", "flex flex-col")}>
            <h3 className="type-title-sm">{h.free.title}</h3>
            <p className="mt-2 font-mono type-display-lg">{h.free.price}</p>
            <p className="mt-1 type-body-sm text-text-muted">{h.free.body(FREE_CREDITS)}</p>
          </li>
          {CREDIT_PACKS.map((pack) => {
            const best = CREDIT_PACKS.length > 1 && pricePerReportPaise(pack) === cheapest;
            return (
              <li key={pack.key} className={cardClass("default", "md", "flex flex-col")}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="type-title-sm">{h.packTitle(pack.credits)}</h3>
                  {/* The page's one sandstone highlight. */}
                  {best && <Badge tone="highlight">{h.bestValue}</Badge>}
                </div>
                <p className="mt-2 font-mono type-display-lg">₹{formatRupees(pack.pricePaise)}</p>
                <p className="mt-1 type-body-sm text-text-muted">{h.perReport(formatRupees(pricePerReportPaise(pack)))}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 type-caption text-balance text-text-muted">{t.disclaimer}</p>
      </section>

      {/* Night ground: data-theme="dark" switches every token inside, so the button takes Olive Light and the logo its reverse colourway. */}
      <section data-theme="dark" className="bg-bg text-text">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className={sectionTitle}>{h.finalTitle}</h2>
            <p className="mt-2 type-body text-text-muted">{h.contactBody}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <LinkButton href="/login" size="lg">
              {cta}
            </LinkButton>
            <WhatsappLink h={h} className={buttonClass("secondary", "", false, "lg")} />
          </div>
        </div>
      </section>
    </>
  );
}
