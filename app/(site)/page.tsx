import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/button";
import { ChatIcon, CheckIcon } from "@/components/icons";
import { APP_NAME, CREDIT_PACKS, FREE_CREDITS, SAMPLE_REPORT_PATH } from "@/lib/config";
import { pricePerReportPaise } from "@/lib/credits/packs";
import { formatRupees } from "@/lib/format";
import { supportWhatsappHref } from "@/lib/site";
import { getT } from "@/lib/i18n.server";
import type { Strings } from "@/lib/strings";

type Home = Strings["home"];

export async function generateMetadata(): Promise<Metadata> {
  const h = (await getT()).home;
  return {
    title: { absolute: h.metaTitle },
    description: h.metaDescription,
    alternates: { canonical: "/" },
    openGraph: { title: h.metaTitle, description: h.metaDescription, url: "/" },
    twitter: { title: h.metaTitle, description: h.metaDescription },
  };
}

function WhatsappLink({ className, h }: { className: string; h: Home }) {
  const href = supportWhatsappHref(h.whatsappMessage);
  const external = href.startsWith("https:");
  return (
    <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener" } : {})}>
      <ChatIcon size={18} />
      {h.whatsapp}
    </a>
  );
}

/** A small static picture of a report, so visitors see what buyers get before tapping the sample. */
function ReportPreview({ h }: { h: Home }) {
  const p = h.preview;
  return (
    <div aria-hidden className="mx-auto w-full max-w-xs rounded-lg border border-border bg-surface p-4 shadow-sheet">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
        <img src="/brand/treadmark-mark-small-color.svg" alt="" width={36} height={36} className="size-9" />
        <div className="min-w-0">
          <p className="truncate type-title-sm">{p.dealer}</p>
          <p className="type-caption text-text-subtle">{p.city}</p>
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="inline-block rounded-xs border-[1.5px] border-plate-border px-1.5 font-mono text-sm font-medium tracking-[0.08em]">{p.reg}</p>
          <p className="mt-1.5 type-title-sm">{p.car}</p>
        </div>
        <p className="shrink-0 text-right text-text">
          <span className="font-display text-3xl leading-none font-extrabold tabular">{p.score}</span>
          <span className="type-caption text-text-subtle">{p.outOf}</span>
        </p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="aspect-[4/3] rounded-xs bg-surface-sunken" />
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-1 type-caption text-text-muted">
        {p.lines.map((line) => (
          <li key={line} className="flex items-center gap-1.5">
            <CheckIcon size={14} className="shrink-0 text-pass" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function Home() {
  const t = await getT();
  const h = t.home;
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

      <section className="bg-bg">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 pt-10 pb-12 md:grid-cols-2 md:pt-16">
          <div className="flex flex-col gap-5">
            <p className="type-overline uppercase tracking-[0.06em] text-text-subtle">{h.eyebrow}</p>
            <h1 className="type-display-lg text-balance sm:type-display-xl">{h.headline}</h1>
            <p className="type-body-lg text-text-muted">{h.subhead}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/login" className="sm:px-6">
                {h.cta}
              </LinkButton>
              <LinkButton href={SAMPLE_REPORT_PATH} variant="secondary">
                {h.sample}
              </LinkButton>
            </div>
            <p className="type-caption text-text-subtle">{h.ctaNote}</p>
          </div>
          <ReportPreview h={h} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <h2 className="type-heading-1">{h.stepsTitle}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {h.steps.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-lg border border-border bg-surface p-5 md:flex-col">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-sm border border-border-control font-mono text-lg font-medium text-text">{i + 1}</span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href={SAMPLE_REPORT_PATH} className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent">
          {h.sample} →
        </Link>
      </section>

      <section className="bg-surface">
        <div className="mx-auto w-full max-w-5xl px-4 py-12">
          <h2 className="type-heading-1">{h.whyTitle}</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {h.why.map((item) => (
              <li key={item.title} className="rounded-lg bg-bg p-5">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-text-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-5xl scroll-mt-16 px-4 py-12">
        <h2 className="type-heading-1">{h.pricingTitle}</h2>
        <p className="mt-2 text-text-muted">{h.pricingSubtitle}</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          <li className="flex flex-col rounded-lg border border-border bg-surface p-5">
            <h3 className="font-semibold">{h.free.title}</h3>
            <p className="mt-2 font-mono text-3xl font-medium">{h.free.price}</p>
            <p className="mt-1 text-text-muted">{h.free.body(FREE_CREDITS)}</p>
            <LinkButton href="/login" className="mt-5">
              {h.cta}
            </LinkButton>
          </li>
          {CREDIT_PACKS.map((pack) => {
            const best = CREDIT_PACKS.length > 1 && pricePerReportPaise(pack) === cheapest;
            return (
              <li key={pack.key} className={`flex flex-col rounded-lg bg-surface p-5 ${best ? "border-2 border-border-control" : "border border-border"}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{h.packTitle(pack.credits)}</h3>
                  {best && <span className="rounded-sm bg-highlight-badge-bg px-2 py-1 type-caption-strong text-highlight-badge-fg">{h.bestValue}</span>}
                </div>
                <p className="mt-2 font-mono text-3xl font-medium">₹{formatRupees(pack.pricePaise)}</p>
                <p className="mt-1 text-text-muted">{h.perReport(formatRupees(pricePerReportPaise(pack)))}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-text-subtle">{t.disclaimer}</p>
      </section>

      {/* Night ground: data-theme="dark" switches every token inside, so buttons take Olive Light automatically. */}
      <section data-theme="dark" className="bg-bg text-text">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="type-heading-1 text-balance">{h.finalTitle}</h2>
            <p className="mt-2 text-text-muted">{h.contactBody}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/login">{h.cta}</LinkButton>
            <WhatsappLink h={h} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-button-secondary-border bg-button-secondary-bg px-5 type-title-sm text-button-secondary-fg active:bg-button-secondary-bg-hover" />
          </div>
        </div>
      </section>

      {/* Always-visible WhatsApp button, the way Indian dealers expect to ask a question. */}
      <WhatsappLink h={h} className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex min-h-12 items-center gap-2 rounded-md bg-text px-4 type-title-sm text-bg shadow-bar active:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" />
    </>
  );
}
