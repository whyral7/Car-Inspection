import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton, buttonClass, cardClass } from "@/components/ui";
import { CheckIcon, ChatIcon, ChevronDownIcon } from "@/components/icons";
import { Plate } from "@/components/plate";
import { APP_NAME, BUSINESS, CREDIT_PACKS, FREE_CREDITS, SAMPLE_REPORT_PATH } from "@/lib/config";
import { ANGLE_KEYS } from "@/lib/photos/angles";
import { pricePerReportPaise } from "@/lib/credits/packs";
import { formatRupees } from "@/lib/format";
import { supportWhatsappHref } from "@/lib/site";
import { en as t } from "@/lib/strings";

const h = t.home;

export const metadata: Metadata = {
  title: { absolute: h.metaTitle },
  description: h.metaDescription,
  alternates: { canonical: "/" },
  openGraph: { title: h.metaTitle, description: h.metaDescription, url: "/" },
  twitter: { title: h.metaTitle, description: h.metaDescription },
};

/** "Chat on WhatsApp". Only shown once BUSINESS.whatsapp is set, so it never leads to a placeholder page. */
function WhatsappLink({ className }: { className: string }) {
  if (!BUSINESS.whatsapp) return null;
  return (
    <a href={supportWhatsappHref()} className={className} target="_blank" rel="noopener">
      <ChatIcon />
      {h.whatsapp}
    </a>
  );
}

/** A small static picture of a report, so visitors see what buyers get before tapping the sample. */
function ReportPreview() {
  const p = h.preview;
  return (
    <div aria-hidden className="mx-auto w-full max-w-xs rotate-1 rounded-card bg-surface p-4 shadow-raised ring-1 ring-line/60">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-chip bg-brand-700 text-small font-bold text-white">{p.dealer.charAt(0)}</span>
        <div className="min-w-0">
          <p className="truncate text-small font-bold">{p.dealer}</p>
          <p className="text-caption text-ink-muted">{p.city}</p>
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Plate reg={p.reg} size="sm" />
          <p className="mt-1.5 text-small leading-snug font-semibold">{p.car}</p>
        </div>
        <p className="shrink-0 rounded-control bg-success-50 px-2.5 py-1.5 text-center text-success-800">
          <span className="text-title tabular">{p.score}</span>
          <span className="text-caption">{p.outOf}</span>
        </p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {ANGLE_KEYS.slice(0, 8).map((key) => (
          // eslint-disable-next-line @next/next/no-img-element -- tiny static drawings
          <img key={key} src={`/sample/${key}.svg`} alt="" width={80} height={60} className="aspect-[4/3] w-full rounded-chip bg-sunken object-cover" />
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-caption text-ink-muted">
        {p.lines.map((line) => (
          <li key={line} className="flex items-center gap-1.5">
            <CheckIcon size={14} className="text-brand-700" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  const cheapest = Math.min(...CREDIT_PACKS.map(pricePerReportPaise));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Android, iOS, Web",
    description: h.metaDescription,
    offers: CREDIT_PACKS.map((pack) => ({ "@type": "Offer", name: h.packTitle(pack.credits), price: pack.pricePaise / 100, priceCurrency: "INR" })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="bg-gradient-to-b from-brand-50 to-canvas">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 pt-10 pb-12 md:grid-cols-2 md:pt-16">
          <div className="flex flex-col gap-5">
            <p className="self-start rounded-full bg-brand-100 px-3 py-1 text-caption font-semibold text-brand-800">{h.eyebrow}</p>
            <h1 className="text-display text-balance sm:text-[2.75rem] sm:leading-[3.25rem]">{h.headline}</h1>
            <p className="text-heading font-normal text-ink-muted">{h.subhead}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <LinkButton href="/login" size="lg" className="sm:px-6">
                {h.cta}
              </LinkButton>
              <LinkButton href={SAMPLE_REPORT_PATH} variant="secondary" size="lg">
                {h.sample}
              </LinkButton>
            </div>
            <p className="text-small text-ink-muted">{h.ctaNote}</p>
          </div>
          <ReportPreview />
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <h2 className="text-title">{h.stepsTitle}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {h.steps.map((step, i) => (
            <li key={step.title} className={cardClass("default", "md", "flex gap-4 md:flex-col")}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-heading text-brand-700">{i + 1}</span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-ink-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href={SAMPLE_REPORT_PATH} className="-mx-2 mt-4 inline-flex min-h-11 items-center rounded-chip px-2 font-semibold text-brand-700 transition-colors hover:bg-brand-50">
          {h.sample} →
        </Link>
      </section>

      <section className="bg-surface">
        <div className="mx-auto w-full max-w-5xl px-4 py-12">
          <h2 className="text-title">{h.whyTitle}</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {h.why.map((item) => (
              <li key={item.title} className="rounded-card bg-canvas p-4 sm:p-6">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-ink-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <h2 className="text-title">{h.faqTitle}</h2>
        <div className="mt-6 flex flex-col gap-3">
          {h.faq.map((item) => (
            <details key={item.q} className="group rounded-card bg-surface shadow-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-4 font-semibold transition-colors hover:bg-canvas sm:px-6 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDownIcon size={20} className="shrink-0 text-ink-subtle transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-ink-muted sm:px-6">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-5xl scroll-mt-16 px-4 py-12">
        <h2 className="text-title">{h.pricingTitle}</h2>
        <p className="mt-2 text-ink-muted">{h.pricingSubtitle}</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          <li className={cardClass("default", "md", "flex flex-col")}>
            <h3 className="font-semibold">{h.free.title}</h3>
            <p className="mt-2 text-display tabular">{h.free.price}</p>
            <p className="mt-1 text-ink-muted">{h.free.body(FREE_CREDITS)}</p>
            <LinkButton href="/login" className="mt-5">
              {h.cta}
            </LinkButton>
          </li>
          {CREDIT_PACKS.map((pack) => {
            const best = CREDIT_PACKS.length > 1 && pricePerReportPaise(pack) === cheapest;
            return (
              <li key={pack.key} className={cardClass("default", "md", `flex flex-col ${best ? "ring-2 ring-brand-700" : ""}`)}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{h.packTitle(pack.credits)}</h3>
                  {best && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-caption font-semibold text-brand-800">{h.bestValue}</span>}
                </div>
                <p className="mt-2 text-display tabular">₹{formatRupees(pack.pricePaise)}</p>
                <p className="mt-1 text-ink-muted">{h.perReport(formatRupees(pricePerReportPaise(pack)))}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-small text-ink-muted">{t.disclaimer}</p>
      </section>

      <section className="bg-brand-800 text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-title font-bold text-balance">{h.finalTitle}</h2>
            <p className="mt-2 text-brand-100">{h.contactBody}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/login" variant="secondary" size="lg" className="!ring-0">
              {h.cta}
            </LinkButton>
            <WhatsappLink className={buttonClass("ghost", "!text-white ring-1 ring-white/40 ring-inset hover:!bg-white/10", false, "lg")} />
          </div>
        </div>
      </section>

      {/* Always-visible WhatsApp button, the way Indian dealers expect to ask a question. */}
      <WhatsappLink className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex min-h-12 items-center gap-2 rounded-full bg-brand-700 px-4 font-semibold text-white shadow-raised transition-colors hover:bg-brand-800" />
    </>
  );
}
