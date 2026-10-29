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
import { formatPhone, telHref, whatsappChatUrl } from "@/lib/report/share";
import type { DetailRow, ReportCheckItem, ReportView as View } from "@/lib/report/view";
import type { Strings } from "@/lib/strings";
import type { ChecklistResult, Severity } from "@/lib/supabase/database.types";

const severityChip: Record<Severity, string> = {
  minor: "bg-amber-100 text-amber-900",
  moderate: "bg-orange-100 text-orange-900",
  major: "bg-red-100 text-red-900",
};
const severityEdge: Record<Severity, string> = {
  minor: "border-l-amber-400",
  moderate: "border-l-orange-500",
  major: "border-l-red-700",
};
const resultChip: Record<ChecklistResult, string> = {
  ok: "bg-emerald-100 text-emerald-900",
  attention: "bg-amber-100 text-amber-900",
  fail: "bg-red-100 text-red-900",
  na: "bg-slate-100 text-slate-800",
};

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {aside && <p className="text-sm text-slate-700">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function Details({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="divide-y divide-line">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap justify-between gap-x-4 py-2 text-sm">
          <dt className="text-slate-700">{row.label}</dt>
          <dd className={`text-right font-semibold ${row.warn ? "text-red-800" : ""}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CheckList({ items }: { items: ReportCheckItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.key} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2">
          <span className={`mt-0.5 min-w-14 shrink-0 rounded-lg px-2 py-0.5 text-center text-xs font-semibold ${resultChip[item.result]}`}>{item.resultLabel}</span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="block">{item.label}</span>
            {item.note && <span className="block text-slate-700">{item.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ScoreBadge({ view, t, className = "" }: { view: Pick<View, "scoreText" | "band">; t: Strings; className?: string }) {
  const s = BAND_STYLE[view.band];
  return (
    <div className={`flex shrink-0 flex-col items-center rounded-2xl px-4 py-3 ring-2 ${s.tint} ${s.text} ${s.ring} ${className}`}>
      <span className="text-xs font-semibold">{t.publicReport.score}</span>
      <span className="text-4xl leading-tight font-bold">
        {view.scoreText}
        <span className="text-base font-semibold">{t.publicReport.outOf}</span>
      </span>
      <span className="text-xs font-bold">{t.publicReport.bands[view.band]}</span>
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
  const base = "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-base font-semibold whitespace-nowrap";
  const buttons = [
    { href: call, label: t.publicReport.callShort, aria: labels.call, icon: <PhoneIcon size={18} />, style: "border border-slate-300 bg-white text-ink active:bg-slate-100" },
    { href: chat, label: t.publicReport.whatsappShort, aria: labels.whatsapp, icon: <ChatIcon size={18} />, style: "bg-whatsapp text-white active:bg-whatsapp-pressed" },
  ];
  return (
    <div className="flex gap-2">
      {buttons.map((b) =>
        preview ? (
          <span key={b.label} aria-disabled="true" aria-label={b.aria} className={`${base} ${b.style}`}>
            {b.icon}
            {b.label}
          </span>
        ) : (
          <a key={b.label} href={b.href} aria-label={b.aria} className={`${base} ${b.style}`} {...(b.href.startsWith("https:") ? { target: "_blank", rel: "noopener" } : {})}>
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
  if (view.findings) parts.push(t.publicReport.summary.findings(view.findings.length).replace(/\.$/, ""));
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
      <header className="flex items-center gap-3">
        {view.dealer.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small public logo, no need for the image optimiser
          <img src={view.dealer.logoUrl} alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl border border-line bg-white object-contain" />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-lg font-bold text-white">{view.dealer.name.charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-lg leading-tight font-bold break-words">{view.dealer.name}</p>
          <p className="text-sm text-slate-700">{[view.dealer.city, t.publicReport.heading].filter(Boolean).join(" · ")}</p>
        </div>
        {shareUrl && <ShareButton url={shareUrl} title={shareTitle} className="shrink-0 rounded-xl px-3 text-sm text-brand-700 active:bg-brand-50" />}
      </header>

      {view.photos && view.photos.length > 0 && <PhotoHero photos={view.photos} />}

      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Plate reg={view.car.regNumber} tone="yellow" />
            <h1 className="mt-2 text-xl leading-snug font-bold">{view.car.title}</h1>
            {summary && <p className="mt-1 text-sm font-medium text-slate-800">{summary}</p>}
            {inspectedOn && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                <ShieldCheckIcon size={16} className="text-brand-700" />
                {t.publicReport.inspectedOn(inspectedOn)}
              </p>
            )}
          </div>
          <ScoreBadge view={view} t={t} />
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-700">
          <InfoIcon size={14} className="mt-px" />
          {t.disclaimer}
        </p>
        <details className="group mt-2">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-brand-700 [&::-webkit-details-marker]:hidden">
            {t.publicReport.scoreHowTitle}
            <ChevronDownIcon size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <p className="rounded-xl bg-canvas p-3 text-sm text-slate-800">{t.publicReport.scoreHow}</p>
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
            <p className="text-sm text-slate-700">{t.publicReport.noFindings}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {view.findings.map((f, i) => (
                <li key={i} className={`rounded-lg border border-l-4 border-line p-3 ${severityEdge[f.severity]}`}>
                  <div className="flex flex-wrap items-start gap-2">
                    <span className={`mt-0.5 shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold ${severityChip[f.severity]}`}>{f.severityLabel}</span>
                    <p className="min-w-0">
                      <span className="font-semibold">{f.typeLabel}</span>
                      {f.location && <span className="text-slate-800"> · {f.location}</span>}
                    </p>
                  </div>
                  {f.note && <p className="mt-1 text-sm text-slate-800">{f.note}</p>}
                  {f.photoLabel && <p className="mt-1 text-xs text-slate-700">{t.publicReport.seenIn(f.photoLabel)}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {view.price && (
        <Section title={t.publicReport.price}>
          <p className="text-2xl font-bold text-ink">{view.price.rangeText}</p>
          <p className="mt-1 text-sm text-slate-700">
            {view.price.adjusted
              ? t.publicReport.priceAdjusted(view.price.marketRangeText, view.price.adjustmentText, view.scoreText)
              : t.publicReport.priceUnadjusted(view.price.marketRangeText)}
          </p>
          {view.price.summary && <p className="mt-2 text-sm text-slate-800">{view.price.summary}</p>}
          <p className="mt-3 text-xs text-slate-700">{t.publicReport.priceBasedOn(view.price.comparables.length, view.price.searchedOn)}</p>
          {view.price.comparables.length > 0 && (
            <ul className="mt-1 flex flex-col">
              {view.price.comparables.map((c) => (
                <li key={c.url}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-h-11 items-center justify-between gap-3 py-1 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-brand-700 underline">{c.title}</span>
                      <span className="block text-xs text-slate-700">{[c.host, c.detail].filter(Boolean).join(" · ")}</span>
                    </span>
                    {c.priceText && <span className="shrink-0 font-semibold">{c.priceText}</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-700">{t.publicReport.priceDisclaimer}</p>
        </Section>
      )}

      {view.photos && view.photos.length > 0 && (
        <Section title={t.publicReport.photos} aside={t.publicReport.photoCount(view.photos.length)}>
          <PhotoGallery photos={view.photos} />
          <p className="mt-2 text-xs text-slate-700">{t.publicReport.tapToEnlarge}</p>
        </Section>
      )}

      {view.checklist && (
        <Section
          title={t.publicReport.checklist}
          aside={t.publicReport.checklistSummary(view.checklist.counts.ok, view.checklist.counts.attention, view.checklist.counts.fail)}
        >
          <div className="flex flex-col gap-3">
            {view.checklist.groups.map((g) => (
              <div key={g.key}>
                <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">{g.label}</h3>
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

      <p className="rounded-2xl bg-slate-100 p-4 text-center text-sm font-semibold text-slate-900">{t.disclaimer}</p>

      <footer className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-4 text-sm">
        <p className="text-slate-700">{t.publicReport.inspectedBy}</p>
        <p className="font-semibold">{view.dealer.name}</p>
        {view.dealer.ownerName && <p className="text-slate-800">{view.dealer.ownerName}</p>}
        {place && <p className="text-slate-800">{place}</p>}
        {phone && <p className="text-slate-800">{phone}</p>}
        {pdfHref && (
          <a href={pdfHref} className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 font-semibold text-brand-800 active:bg-slate-100">
            <DownloadIcon size={18} />
            {t.publicReport.downloadPdf}
          </a>
        )}
        {shareUrl && <ShareButton url={shareUrl} title={shareTitle} label={t.publicReport.shareLong} className="rounded-xl border border-slate-300 text-brand-800 active:bg-slate-100" />}
        {view.publishedOn && <p className="mt-2 text-xs text-slate-700">{t.publicReport.publishedOn(view.publishedOn)}</p>}
        <p className="text-xs text-slate-700">{t.publicReport.madeWith}</p>
      </footer>
    </div>
  );
}
