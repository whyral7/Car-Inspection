// The report body shared by the public page (/r/[slug]), the sample report and the sharer's preview.
// No hooks, so it renders on the server for buyers and in the browser for the live preview.
//
// Order follows the brand's "proof before promise": the car's photos, the red and amber flags (each with
// its photo), the header card (who made it, which car, the score, the ratings), and only then price and details.
import type { ReactNode } from "react";
import { ChatIcon, ChevronDownIcon, DownloadIcon, InfoIcon, PhoneIcon, ShieldCheckIcon } from "@/components/icons";
import { Plate } from "@/components/plate";
import { RedFlag } from "@/components/red-flag";
import { PhotoGallery, PhotoHero } from "@/components/report/photo-gallery";
import { ShareButton } from "@/components/report/share-button";
import { ScoreMeter } from "@/components/score-meter";
import { SeverityBadge } from "@/components/severity";
import { VerdictBadge } from "@/components/verdict-badge";
import { Badge, buttonClass, cardClass, type BadgeTone } from "@/components/ui";
import { formatPhone, telHref, whatsappChatUrl } from "@/lib/report/share";
import { checkCounts, dealerPlace, redFlags, shownChecks, type DetailRow, type ReportCheckItem, type ReportView as View } from "@/lib/report/view";
import type { Strings } from "@/lib/strings";
import type { ChecklistResult } from "@/lib/supabase/database.types";

const resultTone: Record<ChecklistResult, BadgeTone> = { ok: "success", attention: "warning", fail: "danger", na: "neutral" };

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className={cardClass()}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="type-heading-2">{title}</h2>
        {aside && <p className="type-body-sm text-text-muted">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function Details({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap justify-between gap-x-4 py-3 type-body-sm">
          <dt className="text-text-muted">{row.label}</dt>
          <dd className={`text-right type-title-sm ${row.warn ? "text-fail" : ""}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CheckRows({ items }: { items: ReportCheckItem[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.key} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3">
          <Badge tone={resultTone[item.result]} className="mt-px min-w-20 justify-center">
            {item.resultLabel}
          </Badge>
          <span className="min-w-0 flex-1 type-body-sm">
            <span className="block">{item.label}</span>
            {item.note && <span className="block text-text-muted">{item.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A buyer reads what needs attention first: Attention and Fail rows are always open, and the rows that
 * passed (or don't apply) fold into one line with their count, so the report isn't a wall of "Pass".
 */
function CheckList({ items, t }: { items: ReportCheckItem[]; t: Strings }) {
  const flagged = items.filter((i) => i.result === "attention" || i.result === "fail");
  const rest = items.filter((i) => i.result === "ok" || i.result === "na");
  const passed = rest.filter((i) => i.result === "ok").length;
  const na = rest.length - passed;
  return (
    <>
      {flagged.length > 0 && <CheckRows items={flagged} />}
      {rest.length > 0 && (
        <details className={`group ${flagged.length > 0 ? "border-t border-border" : ""}`}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-sm transition-colors hover:bg-surface-sunken [&::-webkit-details-marker]:hidden">
            {passed > 0 && <Badge tone="success">{`${passed} ${t.checklist.results.ok}`}</Badge>}
            {na > 0 && <Badge>{`${na} ${t.checklist.results.na}`}</Badge>}
            <ChevronDownIcon size={18} className="ml-auto text-text-muted transition-transform group-open:rotate-180" />
          </summary>
          <CheckRows items={rest} />
        </details>
      )}
    </>
  );
}

/** The report's score: ink number, five bars, grade word. Strings come in as a prop (server page and client preview). */
export function ScoreBadge({ view, t, sub, className = "" }: { view: Pick<View, "score" | "scoreText" | "band">; t: Strings; sub?: ReactNode; className?: string }) {
  const grade = t.publicReport.bands[view.band];
  return (
    <ScoreMeter
      score={view.score}
      scoreText={view.scoreText}
      outOf={t.publicReport.outOf}
      grade={grade}
      sub={sub}
      label={`${t.publicReport.score} ${view.scoreText}${t.publicReport.outOf}, ${grade}`}
      animate
      className={className}
    />
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

type ReportViewProps = {
  view: View;
  t: Strings;
  pdfHref?: string | null;
  /** The public link, for the buyer's Share button. Not shown in the sharer's preview. */
  shareUrl?: string | null;
  /** The car's name is the page title on the public report; inside the owner's preview it is a section heading. */
  titleAs?: "h1" | "h2";
};

export function ReportView({ view, t, pdfHref, shareUrl, titleAs: Title = "h1" }: ReportViewProps) {
  const phone = formatPhone(view.dealer.phone);
  const place = dealerPlace(view.dealer);
  const takenOn = view.photos?.find((p) => p.takenAt)?.takenAt?.split(",")[0] ?? null;
  const inspectedOn = view.publishedOn ?? takenOn;
  const shareTitle = t.publicReport.ogTitle(view.car.title || view.car.regNumber, view.scoreText);
  const flags = redFlags(view);
  const red = flags.filter((f) => f.tone === "fail").length;
  const counts = shownChecks(view).length > 0 ? checkCounts(view) : null;
  const photoByKey = new Map(view.photos?.map((p) => [p.key, p]) ?? []);
  const issuer = [view.dealer.name, view.dealer.city].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6">
      {/* Proof before promise: the car itself, then what to check, then the score. The price comes later. */}
      {view.photos && view.photos.length > 0 && <PhotoHero photos={view.photos} />}

      {flags.length > 0 && (
        <section aria-labelledby="flags-title" className="flex flex-col gap-2">
          <h2 id="flags-title" className="caps type-overline text-text-muted">
            {t.publicReport.flagsTitle(flags.length)}
          </h2>
          {flags.map((flag) => {
            const photo = flag.photoKey ? photoByKey.get(flag.photoKey) : undefined;
            return (
              <RedFlag
                key={flag.key}
                tone={flag.tone}
                title={flag.title}
                photo={
                  photo && (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URL of the small copy, not optimisable
                    <img src={photo.thumbUrl} alt={photo.label} width={56} height={56} loading="lazy" decoding="async" className="size-14 shrink-0 rounded-md bg-photo-fallback object-cover" />
                  )
                }
              >
                {flag.body ?? (flag.rated ? t.publicReport.flagRated(flag.rated) : null)}
              </RedFlag>
            );
          })}
        </section>
      )}

      {/* Brand ReportHeader: who made it, which car, the score, the headline ratings. */}
      <section className="overflow-hidden rounded-lg bg-report-bg shadow-card">
        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-report-divider px-[var(--report-padding)] py-3">
          {view.dealer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small public logo, no need for the image optimiser
            <img src={view.dealer.logoUrl} alt={view.dealer.name} className="h-[var(--logo-height-header)] w-auto max-w-32 object-contain" />
          ) : (
            // The page header already carries the Treadmark lockup, so the issuer is named in type here.
            <p className="min-w-0 truncate type-title-sm">{view.dealer.name}</p>
          )}
          {view.slug && <p className="type-code-sm text-report-id">{t.publicReport.reportId(view.slug)}</p>}
        </div>
        <div className="grid gap-[var(--report-padding)] p-[var(--report-padding)]">
          <div>
            <p className="type-caption text-report-facts">{[view.dealer.logoUrl ? issuer : view.dealer.city, t.publicReport.heading].filter(Boolean).join(" · ")}</p>
            <Title className="mt-1 type-heading-2 break-words">{view.car.title || view.car.regNumber}</Title>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2 type-caption text-report-facts">
              <Plate reg={view.car.regNumber} size="sm" />
              {view.car.facts.map((fact) => (fact.reading ? <b key={fact.text} className="type-code-strong text-text">{fact.text}</b> : <span key={fact.text}>{fact.text}</span>))}
            </div>
          </div>

          <ScoreBadge view={view} t={t} sub={flags.length > 0 || counts ? t.publicReport.flagsSub(red, flags.length - red) : undefined} />

          {counts && (
            // At most three rating badges; the details are further down.
            <div className="flex flex-wrap gap-2">
              <VerdictBadge verdict="pass">{`${counts.ok} ${t.checklist.results.ok}`}</VerdictBadge>
              {counts.attention > 0 && <VerdictBadge verdict="attention">{`${counts.attention} ${t.checklist.results.attention}`}</VerdictBadge>}
              {counts.fail > 0 && <VerdictBadge verdict="fail">{`${counts.fail} ${t.checklist.results.fail}`}</VerdictBadge>}
            </div>
          )}

          <div className="flex flex-col gap-1 border-t border-report-divider pt-3">
            {inspectedOn && (
              <p className="flex items-center gap-2 type-caption text-report-facts">
                <ShieldCheckIcon size={16} />
                {t.publicReport.inspectedOn(inspectedOn)}
              </p>
            )}
            <p className="flex items-start gap-2 type-caption text-balance text-report-facts">
              <InfoIcon size={16} className="mt-px" />
              {t.disclaimer}
            </p>
            <details className="group">
              <summary className="-mx-2 inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-sm px-2 type-label text-button-ghost-fg transition-colors hover:bg-button-ghost-bg-hover [&::-webkit-details-marker]:hidden">
                {t.publicReport.scoreHowTitle}
                <ChevronDownIcon size={16} className="transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-1 animate-rise-in rounded-md bg-surface-sunken p-4 type-body-sm">{t.publicReport.scoreHow}</p>
            </details>
          </div>
        </div>
      </section>

      {view.findings && (
        <Section title={t.publicReport.findings} aside={t.publicReport.findingCount(view.findings.length)}>
          {view.findings.length === 0 ? (
            <p className="type-body-sm text-text-muted">{t.publicReport.noFindings}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {view.findings.map((f, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border p-4"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <SeverityBadge severity={f.severity} label={f.severityLabel} className="mt-px" />
                    <p className="min-w-0">
                      <span className="type-title-sm">{f.typeLabel}</span>
                      {f.location && <span className="text-text"> · {f.location}</span>}
                    </p>
                  </div>
                  {f.note && <p className="mt-1 type-body-sm text-text">{f.note}</p>}
                  {f.photoLabel && <p className="mt-1 type-caption text-text-muted">{t.publicReport.seenIn(f.photoLabel)}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {view.price && (
        <Section title={t.publicReport.price}>
          <p className="font-mono type-heading-2">{view.price.rangeText}</p>
          <p className="mt-1 type-body-sm text-text-muted">
            {view.price.adjusted
              ? t.publicReport.priceAdjusted(view.price.marketRangeText, view.price.adjustmentText, view.scoreText)
              : t.publicReport.priceUnadjusted(view.price.marketRangeText)}
          </p>
          {view.price.summary && <p className="mt-2 type-body-sm text-text">{view.price.summary}</p>}
          <p className="mt-4 type-caption text-text-muted">{t.publicReport.priceBasedOn(view.price.comparables.length, view.price.searchedOn)}</p>
          {view.price.comparables.length > 0 && (
            <ul className="mt-1 flex flex-col">
              {view.price.comparables.map((c) => (
                <li key={c.url}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="-mx-2 flex min-h-12 items-center justify-between gap-4 rounded-sm px-2 py-1 type-body-sm transition-colors hover:bg-surface-sunken">
                    <span className="min-w-0">
                      <span className="block truncate type-label text-accent underline underline-offset-4">{c.title}</span>
                      <span className="block type-caption text-text-muted">{[c.host, c.detail].filter(Boolean).join(" · ")}</span>
                    </span>
                    {c.priceText && <span className="shrink-0 type-code-strong">{c.priceText}</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 type-caption text-text-muted">{t.publicReport.priceDisclaimer}</p>
        </Section>
      )}

      {view.photos && view.photos.length > 0 && (
        <Section title={t.publicReport.photos} aside={t.publicReport.photoCount(view.photos.length)}>
          <PhotoGallery photos={view.photos} />
          <p className="mt-2 type-caption text-text-muted">{t.publicReport.tapToEnlarge}</p>
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
                <h3 className="type-title-sm">{g.label}</h3>
                <CheckList items={g.items} t={t} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {view.documents && (
        <Section title={t.publicReport.documents}>
          <Details rows={view.documents.rows} />
          {view.documents.items.length > 0 && <CheckList items={view.documents.items} t={t} />}
        </Section>
      )}

      <p className="flex items-start justify-center gap-2 rounded-lg bg-surface-sunken p-4 text-center type-label">
        <InfoIcon size={18} className="mt-px text-text-muted" />
        {t.disclaimer}
      </p>

      <footer className={cardClass("default", "md", "flex flex-col gap-1 type-body-sm")}>
        <p className="text-text-muted">{t.publicReport.inspectedBy}</p>
        <p className="type-title-sm">{view.dealer.name}</p>
        {view.dealer.ownerName && <p className="text-text">{view.dealer.ownerName}</p>}
        {place && <p className="text-text">{place}</p>}
        {phone && <p className="text-text">{phone}</p>}
        {pdfHref && (
          <a href={pdfHref} className={buttonClass("secondary", "mt-4")}>
            <DownloadIcon size={18} />
            {t.publicReport.downloadPdf}
          </a>
        )}
        {shareUrl && <ShareButton url={shareUrl} title={shareTitle} label={t.publicReport.shareLong} className={buttonClass("ghost", "mt-2")} />}
        {view.publishedOn && <p className="mt-2 type-caption text-text-muted">{t.publicReport.publishedOn(view.publishedOn)}</p>}
        <p className="type-caption text-text-muted">{t.publicReport.madeWith}</p>
      </footer>
    </div>
  );
}
