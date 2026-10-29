// The report body shared by the public page (/r/[slug]), the sample report and the sharer's preview.
// No hooks, so it renders on the server for buyers and in the browser for the live preview.
//
// Order follows what a buyer wants first: the car's photos, then one summary card (plate, score,
// what was found, when), then price and the details.
import type { ReactNode } from "react";
import { ChatIcon, ChevronDownIcon, DownloadIcon, InfoIcon, PhoneIcon, ShieldCheckIcon } from "@/components/icons";
import { Plate } from "@/components/plate";
import { PhotoGallery, PhotoHero } from "@/components/report/photo-gallery";
import { ShareButton } from "@/components/report/share-button";
import { BAND_STYLE } from "@/components/score-chip";
import { SEVERITY_EDGE, SEVERITY_TONE } from "@/components/severity";
import { Badge, buttonClass, cardClass, type BadgeTone } from "@/components/ui";
import { formatPhone, telHref, whatsappChatUrl } from "@/lib/report/share";
import type { DetailRow, ReportCheckItem, ReportView as View } from "@/lib/report/view";
import type { Strings } from "@/lib/strings";
import type { ChecklistResult } from "@/lib/supabase/database.types";

const resultTone: Record<ChecklistResult, BadgeTone> = { ok: "success", attention: "warning", fail: "danger", na: "neutral" };

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className={cardClass()}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="text-heading">{title}</h2>
        {aside && <p className="text-small text-ink-muted">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function Details({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="divide-y divide-line">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap justify-between gap-x-4 py-3 text-small">
          <dt className="text-ink-muted">{row.label}</dt>
          <dd className={`text-right font-semibold ${row.warn ? "text-danger-700" : ""}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CheckList({ items }: { items: ReportCheckItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.key} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3">
          <Badge tone={resultTone[item.result]} className="mt-px min-w-16 justify-center">
            {item.resultLabel}
          </Badge>
          <span className="min-w-0 flex-1 text-small">
            <span className="block">{item.label}</span>
            {item.note && <span className="block text-ink-muted">{item.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ScoreBadge({ view, t, className = "" }: { view: Pick<View, "scoreText" | "band">; t: Strings; className?: string }) {
  const s = BAND_STYLE[view.band];
  return (
    <div className={`flex shrink-0 flex-col items-center rounded-card px-4 py-2 ring-1 ring-inset ${s.tint} ${s.text} ${s.ring} ${className}`}>
      <span className="text-caption font-semibold">{t.publicReport.score}</span>
      <span className="text-display tabular">
        {view.scoreText}
        <span className="text-body font-semibold">{t.publicReport.outOf}</span>
      </span>
      <span className="text-caption font-bold">{t.publicReport.bands[view.band]}</span>
    </div>
  );
}

/** "Call" and "WhatsApp" for whoever shared the report. In the sharer's own preview they are shown but do nothing. */
export function ContactButtons({ view, t, preview = false }: { view: View; t: Strings; preview?: boolean }) {
  const { userType, phone } = view.dealer;
  const message = t.publicReport.contactMessage(view.car.title || view.car.regNumber, view.car.regNumber, userType !== "buyer");
  const call = telHref(phone);
  const chat = whatsappChatUrl(phone, message);
  if (!call || !chat) return null;
  const labels = t.publicReport.contact[userType];
  const buttons = [
    { href: call, label: t.publicReport.callShort, aria: labels.call, icon: <PhoneIcon size={18} />, style: buttonClass("secondary", "flex-1 whitespace-nowrap") },
    { href: chat, label: t.publicReport.whatsappShort, aria: labels.whatsapp, icon: <ChatIcon size={18} />, style: buttonClass("primary", "flex-1 whitespace-nowrap") },
  ];
  return (
    <div className="flex gap-2">
      {buttons.map((b) =>
        preview ? (
          <span key={b.label} aria-disabled="true" aria-label={b.aria} className={b.style}>
            {b.icon}
            {b.label}
          </span>
        ) : (
          <a key={b.label} href={b.href} aria-label={b.aria} className={b.style} {...(b.href.startsWith("https:") ? { target: "_blank", rel: "noopener" } : {})}>
            {b.icon}
            {b.label}
          </a>
        ),
      )}
    </div>
  );
}

/** One line on what was found, for the summary card: "3 damage notes · 15 OK, 2 need attention, 1 problem". */
function summaryLine(view: View, t: Strings) {
  const parts: string[] = [];
  if (view.findings) parts.push(t.publicReport.summary.findings(view.findings.length).replace(/[.।]$/, ""));
  if (view.checklist) parts.push(t.publicReport.checklistSummary(view.checklist.counts.ok, view.checklist.counts.attention, view.checklist.counts.fail));
  return parts.join(" · ");
}

type ReportViewProps = {
  view: View;
  t: Strings;
  pdfHref?: string | null;
  /** The public link, for the buyer's Share button. Not shown in the sharer's preview. */
  shareUrl?: string | null;
};

export function ReportView({ view, t, pdfHref, shareUrl }: ReportViewProps) {
  const phone = formatPhone(view.dealer.phone);
  const place = [view.dealer.address, view.dealer.city].filter(Boolean).join(", ");
  const takenOn = view.photos?.find((p) => p.takenAt)?.takenAt?.split(",")[0] ?? null;
  const inspectedOn = view.publishedOn ?? takenOn;
  const summary = summaryLine(view, t);
  const shareTitle = t.publicReport.ogTitle(view.car.title || view.car.regNumber, view.scoreText);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-4">
        {view.dealer.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small public logo, no need for the image optimiser
          <img src={view.dealer.logoUrl} alt="" width={48} height={48} className="size-12 shrink-0 rounded-control bg-surface object-contain ring-1 ring-line" />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-control bg-brand-700 text-heading text-white">{view.dealer.name.charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-heading break-words">{view.dealer.name}</p>
          <p className="text-small text-ink-muted">{[view.dealer.city, t.publicReport.heading].filter(Boolean).join(" · ")}</p>
        </div>
        {shareUrl && <ShareButton url={shareUrl} title={shareTitle} className={buttonClass("ghost", "-mr-2 shrink-0 !px-2", false, "sm")} />}
      </header>

      {view.photos && view.photos.length > 0 && <PhotoHero photos={view.photos} />}

      <section className={cardClass()}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Plate reg={view.car.regNumber} className="self-start" />
            <h1 className="text-title">{view.car.title}</h1>
          </div>
          <ScoreBadge view={view} t={t} />
        </div>
        {summary && <p className="mt-4 font-medium">{summary}</p>}
        {inspectedOn && (
          <p className="mt-1 flex items-center gap-2 text-small text-ink-muted">
            <ShieldCheckIcon size={16} className="text-brand-700" />
            {t.publicReport.inspectedOn(inspectedOn)}
          </p>
        )}
        <p className="mt-4 flex items-start gap-2 text-caption text-ink-muted">
          <InfoIcon size={14} className="mt-px" />
          {t.disclaimer}
        </p>
        <details className="group mt-2">
          <summary className="-mx-2 inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-chip px-2 text-small font-semibold text-brand-700 transition-colors hover:bg-brand-50 [&::-webkit-details-marker]:hidden">
            {t.publicReport.scoreHowTitle}
            <ChevronDownIcon size={16} className="transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="mt-2 animate-rise-in rounded-control bg-canvas p-4 text-small">{t.publicReport.scoreHow}</p>
        </details>
        {view.car.details.length > 0 && (
          <div className="mt-2">
            <Details rows={view.car.details} />
          </div>
        )}
      </section>

      {view.findings && (
        <Section title={t.publicReport.findings} aside={t.publicReport.findingCount(view.findings.length)}>
          {view.findings.length === 0 ? (
            <p className="text-small text-ink-muted">{t.publicReport.noFindings}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {view.findings.map((f, i) => (
                <li
                  key={i}
                  className={`relative overflow-hidden rounded-control p-4 pl-5 ring-1 ring-line ring-inset before:absolute before:inset-y-0 before:left-0 before:w-1 ${SEVERITY_EDGE[f.severity]}`}
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <Badge tone={SEVERITY_TONE[f.severity]} className="mt-px">
                      {f.severityLabel}
                    </Badge>
                    <p className="min-w-0">
                      <span className="font-semibold">{f.typeLabel}</span>
                      {f.location && <span className="text-ink"> · {f.location}</span>}
                    </p>
                  </div>
                  {f.note && <p className="mt-1 text-small text-ink">{f.note}</p>}
                  {f.photoLabel && <p className="mt-1 text-caption text-ink-muted">{t.publicReport.seenIn(f.photoLabel)}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {view.price && (
        <Section title={t.publicReport.price}>
          <p className="text-title tabular">{view.price.rangeText}</p>
          <p className="mt-1 text-small text-ink-muted">
            {view.price.adjusted
              ? t.publicReport.priceAdjusted(view.price.marketRangeText, view.price.adjustmentText, view.scoreText)
              : t.publicReport.priceUnadjusted(view.price.marketRangeText)}
          </p>
          {view.price.summary && <p className="mt-2 text-small text-ink">{view.price.summary}</p>}
          <p className="mt-4 text-caption text-ink-muted">{t.publicReport.priceBasedOn(view.price.comparables.length, view.price.searchedOn)}</p>
          {view.price.comparables.length > 0 && (
            <ul className="mt-1 flex flex-col">
              {view.price.comparables.map((c) => (
                <li key={c.url}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="-mx-2 flex min-h-12 items-center justify-between gap-4 rounded-chip px-2 py-1 text-small transition-colors hover:bg-canvas">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-brand-700 underline">{c.title}</span>
                      <span className="block text-caption text-ink-muted">{[c.host, c.detail].filter(Boolean).join(" · ")}</span>
                    </span>
                    {c.priceText && <span className="shrink-0 font-semibold">{c.priceText}</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-caption text-ink-muted">{t.publicReport.priceDisclaimer}</p>
        </Section>
      )}

      {view.photos && view.photos.length > 0 && (
        <Section title={t.publicReport.photos} aside={t.publicReport.photoCount(view.photos.length)}>
          <PhotoGallery photos={view.photos} />
          <p className="mt-2 text-caption text-ink-muted">{t.publicReport.tapToEnlarge}</p>
        </Section>
      )}

      {view.checklist && (
        <Section
          title={t.publicReport.checklist}
          aside={t.publicReport.checklistSummary(view.checklist.counts.ok, view.checklist.counts.attention, view.checklist.counts.fail)}
        >
          <div className="flex flex-col gap-4">
            {view.checklist.groups.map((g) => (
              <div key={g.key}>
                <h3 className="text-caption font-semibold tracking-wide text-ink-muted uppercase">{g.label}</h3>
                <CheckList items={g.items} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {view.documents && (
        <Section title={t.publicReport.documents}>
          <Details rows={view.documents.rows} />
          {view.documents.items.length > 0 && <CheckList items={view.documents.items} />}
        </Section>
      )}

      <p className="flex items-start justify-center gap-2 rounded-card bg-sunken p-4 text-center text-small font-semibold">
        <InfoIcon size={18} className="mt-px text-ink-muted" />
        {t.disclaimer}
      </p>

      <footer className={cardClass("default", "md", "flex flex-col gap-1 text-small")}>
        <p className="text-ink-muted">{t.publicReport.inspectedBy}</p>
        <p className="font-semibold">{view.dealer.name}</p>
        {view.dealer.ownerName && <p className="text-ink">{view.dealer.ownerName}</p>}
        {place && <p className="text-ink">{place}</p>}
        {phone && <p className="text-ink">{phone}</p>}
        {pdfHref && (
          <a href={pdfHref} className={buttonClass("secondary", "mt-4")}>
            <DownloadIcon size={18} />
            {t.publicReport.downloadPdf}
          </a>
        )}
        {shareUrl && <ShareButton url={shareUrl} title={shareTitle} label={t.publicReport.shareLong} className={buttonClass("ghost", "mt-2")} />}
        {view.publishedOn && <p className="mt-2 text-caption text-ink-muted">{t.publicReport.publishedOn(view.publishedOn)}</p>}
        <p className="text-caption text-ink-muted">{t.publicReport.madeWith}</p>
      </footer>
    </div>
  );
}
