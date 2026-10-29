import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/button";
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
    <div aria-hidden className="mx-auto w-full max-w-xs rotate-1 rounded-2xl border border-line bg-white p-4 shadow-xl shadow-slate-900/10">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">{p.dealer.charAt(0)}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{p.dealer}</p>
          <p className="text-xs text-slate-600">{p.city}</p>
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Plate reg={p.reg} size="sm" tone="yellow" />
          <p className="mt-1.5 text-sm leading-snug font-semibold">{p.car}</p>
        </div>
        <p className="shrink-0 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-center text-emerald-800">
          <span className="text-2xl font-bold">{p.score}</span>
          <span className="text-xs">{p.outOf}</span>
        </p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {ANGLE_KEYS.slice(0, 8).map((key) => (
          // eslint-disable-next-line @next/next/no-img-element -- tiny static drawings
          <img key={key} src={`/sample/${key}.svg`} alt="" width={80} height={60} className="aspect-[4/3] w-full rounded-lg bg-slate-100 object-cover" />
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-xs text-slate-700">
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

      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 pt-10 pb-12 md:grid-cols-2 md:pt-16">
          <div className="flex flex-col gap-5">
            <p className="self-start rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">{h.eyebrow}</p>
            <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">{h.headline}</h1>
            <p className="text-lg text-slate-600">{h.subhead}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/login" className="sm:px-6">
                {h.cta}
              </LinkButton>
              <LinkButton href={SAMPLE_REPORT_PATH} variant="secondary">
                {h.sample}
              </LinkButton>
            </div>
            <p className="text-sm text-slate-600">{h.ctaNote}</p>
          </div>
          <ReportPreview />
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-bold">{h.stepsTitle}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {h.steps.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-2xl border border-line bg-white p-5 md:flex-col">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-lg font-bold text-white">{i + 1}</span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-slate-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href={SAMPLE_REPORT_PATH} className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand-700">
          {h.sample} →
        </Link>
      </section>

      <section className="bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-12">
          <h2 className="text-2xl font-bold">{h.whyTitle}</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {h.why.map((item) => (
              <li key={item.title} className="rounded-2xl border border-line bg-canvas p-5">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-slate-600">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-bold">{h.faqTitle}</h2>
        <div className="mt-6 flex flex-col gap-3">
          {h.faq.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-line bg-white">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDownIcon size={20} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-4 text-slate-700">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-5xl scroll-mt-16 px-4 py-12">
        <h2 className="text-2xl font-bold">{h.pricingTitle}</h2>
        <p className="mt-2 text-slate-600">{h.pricingSubtitle}</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          <li className="flex flex-col rounded-2xl border border-line bg-white p-5">
            <h3 className="font-semibold">{h.free.title}</h3>
            <p className="mt-2 text-3xl font-bold">{h.free.price}</p>
            <p className="mt-1 text-slate-600">{h.free.body(FREE_CREDITS)}</p>
            <LinkButton href="/login" className="mt-5">
              {h.cta}
            </LinkButton>
          </li>
          {CREDIT_PACKS.map((pack) => {
            const best = CREDIT_PACKS.length > 1 && pricePerReportPaise(pack) === cheapest;
            return (
              <li key={pack.key} className={`flex flex-col rounded-2xl border bg-white p-5 ${best ? "border-brand-600 ring-1 ring-brand-600" : "border-line"}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{h.packTitle(pack.credits)}</h3>
                  {best && <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">{h.bestValue}</span>}
                </div>
                <p className="mt-2 text-3xl font-bold">₹{formatRupees(pack.pricePaise)}</p>
                <p className="mt-1 text-slate-600">{h.perReport(formatRupees(pricePerReportPaise(pack)))}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-slate-600">{t.disclaimer}</p>
      </section>

      <section className="bg-brand-700 text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-balance">{h.finalTitle}</h2>
            <p className="mt-2 text-brand-100">{h.contactBody}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/login" variant="secondary" className="border-white">
              {h.cta}
            </LinkButton>
            <WhatsappLink className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 font-semibold text-white active:bg-whatsapp-pressed" />
          </div>
        </div>
      </section>

      {/* Always-visible WhatsApp button, the way Indian dealers expect to ask a question. */}
      <WhatsappLink className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex min-h-12 items-center gap-2 rounded-full bg-whatsapp px-4 font-semibold text-white shadow-lg shadow-slate-900/20 active:bg-whatsapp-pressed" />
    </>
  );
}
