// The report body shared by the public page (/r/[slug]) and the dealer's preview. No hooks, so it
// renders on the server for buyers and in the browser for the live preview.
import type { ReactNode } from "react";
import { AlertIcon, ChatIcon, CheckIcon, CrossCircleIcon, DownloadIcon, PhoneIcon } from "@/components/icons";
import { PhotoGallery } from "@/components/report/photo-gallery";
import { formatPhone, telHref, whatsappChatUrl } from "@/lib/report/share";
import type { DetailRow, ReportCheckItem, ReportView as View } from "@/lib/report/view";
import { scoreBars } from "@/lib/score";
import type { Strings } from "@/lib/strings";
import type { ChecklistResult, Severity } from "@/lib/supabase/database.types";

// Verdicts always carry a word and a glyph as well as a colour (brand rule), never colour alone.
const severityChip: Record<Severity, string> = {
  minor: "bg-verdict-attention-bg text-verdict-attention-fg",
  moderate: "bg-verdict-attention-bg text-verdict-attention-fg",
  major: "bg-verdict-fail-bg text-verdict-fail-fg",
};
const resultChip: Record<ChecklistResult, string> = {
  ok: "bg-verdict-pass-bg text-verdict-pass-fg",
  attention: "bg-verdict-attention-bg text-verdict-attention-fg",
  fail: "bg-verdict-fail-bg text-verdict-fail-fg",
  na: "bg-verdict-na-bg text-verdict-na-fg",
};
const resultGlyph: Record<ChecklistResult, ReactNode> = {
  ok: <CheckIcon size={14} />,
  attention: <AlertIcon size={14} />,
  fail: <CrossCircleIcon size={14} />,
  na: null,
};
const severityGlyph: Record<Severity, ReactNode> = {
  minor: <AlertIcon size={14} />,
  moderate: <AlertIcon size={14} />,
  major: <CrossCircleIcon size={14} />,
};

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="type-heading-2">{title}</h2>
        {aside && <p className="text-right text-sm text-text-subtle">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function Details({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4 py-2 text-sm">
          <dt className="text-text-muted">{row.label}</dt>
          <dd className={`text-right font-medium ${row.warn ? "text-fail" : ""}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CheckList({ items }: { items: ReportCheckItem[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.key} className="flex items-start gap-3 py-2">
          <span className={`mt-0.5 inline-flex w-24 shrink-0 items-center gap-1 rounded-sm px-2 py-1 type-caption-strong ${resultChip[item.result]}`}>
            {resultGlyph[item.result]}
            {item.resultLabel}
          </span>
          <span className="min-w-0 text-sm">
            <span className="block">{item.label}</span>
            {item.note && <span className="block text-text-muted">{item.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Score out of 10 in ink, five rising bars (the highest filled one in olive) and the grade word. */
// Strings come in as a prop: this renders on the server (public report) and inside the dealer's client preview.
export function ScoreBadge({ view, t, className = "" }: { view: Pick<View, "score" | "scoreText" | "band">; t: Strings; className?: string }) {
  const filled = scoreBars(view.score);
  return (
    <div
      role="img"
      aria-label={`${t.publicReport.score} ${view.scoreText} ${t.publicReport.outOf}, ${t.publicReport.bands[view.band]}`}
      className={`flex shrink-0 flex-col items-end gap-1 ${className}`}
    >
      <span className="type-overline uppercase tracking-[0.06em] text-text-subtle">{t.publicReport.score}</span>
      <div className="flex items-end gap-2">
        <span className="type-display-lg tabular text-text">
          {view.scoreText}
          <span className="type-body text-text-subtle">{t.publicReport.outOf}</span>
        </span>
        <span aria-hidden="true" className="mb-1.5 flex items-end gap-0.5">
          {[16, 20, 24, 28, 32].map((h, i) => (
            <span
              key={h}
              style={{ height: h }}
              className={`w-1.5 rounded-xs ${i + 1 === filled ? "bg-accent" : i < filled ? "bg-text" : "bg-border"}`}
            />
          ))}
        </span>
      </div>
      <span className="type-title-sm text-text">{t.publicReport.bands[view.band]}</span>
    </div>
  );
}

/** "Call dealer" and "WhatsApp dealer" (or owner). In the sharer's own preview they are shown but do nothing. */
export function ContactButtons({ view, t, preview = false }: { view: View; t: Strings; preview?: boolean }) {
  const { userType, phone } = view.dealer;
  const message = t.publicReport.contactMessage(view.car.title || view.car.regNumber, view.car.regNumber, userType !== "buyer");
  const call = telHref(phone);
  const chat = whatsappChatUrl(phone, message);
  if (!call || !chat) return null;
  const labels = t.publicReport.contact[userType];
  const base = "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md px-3 type-title-sm";
  const buttons = [
    { href: call, label: labels.call, icon: <PhoneIcon size={18} />, style: "border border-button-secondary-border bg-button-secondary-bg text-button-secondary-fg active:bg-button-secondary-bg-hover" },
    { href: chat, label: labels.whatsapp, icon: <ChatIcon size={18} />, style: "bg-button-primary-bg text-button-primary-fg active:bg-button-primary-bg-hover" },
  ];
  return (
    <div className="flex gap-2">
      {buttons.map((b) =>
        preview ? (
          <span key={b.label} aria-disabled="true" className={`${base} ${b.style}`}>
            {b.icon}
            {b.label}
          </span>
        ) : (
          <a key={b.label} href={b.href} className={`${base} ${b.style}`} {...(b.href.startsWith("https:") ? { target: "_blank", rel: "noopener" } : {})}>
            {b.icon}
            {b.label}
          </a>
        ),
      )}
    </div>
  );
}

export function ReportView({ view, t, pdfHref }: { view: View; t: Strings; pdfHref?: string | null }) {
  const phone = formatPhone(view.dealer.phone);
  const place = [view.dealer.address, view.dealer.city].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        {view.dealer.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small public logo, no need for the image optimiser
          <img src={view.dealer.logoUrl} alt="" width={48} height={48} className="size-12 shrink-0 rounded-md border border-border bg-surface object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- static brand SVG
          <img src="/brand/treadmark-mark-small-color.svg" alt="" width={48} height={48} className="size-12 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate type-title-sm text-text">{view.dealer.name}</p>
          {view.dealer.city && <p className="truncate type-caption text-text-muted">{view.dealer.city}</p>}
        </div>
        <span className="shrink-0 type-overline uppercase tracking-[0.06em] text-text-subtle">{t.publicReport.heading}</span>
      </header>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-block rounded-xs border-[1.5px] border-plate-border px-2 py-0.5 font-mono text-base font-medium tracking-[0.08em]">{view.car.regNumber}</p>
            <h1 className="mt-2 type-heading-2 text-text">{view.car.title}</h1>
          </div>
          <ScoreBadge view={view} t={t} />
        </div>
        {view.car.details.length > 0 && (
          <div className="mt-3">
            <Details rows={view.car.details} />
          </div>
        )}
      </section>

      {view.price && (
        <Section title={t.publicReport.price}>
          <p className="font-mono text-xl font-medium text-text">{view.price.rangeText}</p>
          <p className="mt-1 text-sm text-text-muted">{view.price.adjusted
              ? t.publicReport.priceAdjusted(view.price.marketRangeText, view.price.adjustmentText, view.scoreText)
              : t.publicReport.priceUnadjusted(view.price.marketRangeText)}</p>
          {view.price.summary && <p className="mt-2 text-sm text-text-muted">{view.price.summary}</p>}
          <p className="mt-3 text-xs text-text-subtle">{t.publicReport.priceBasedOn(view.price.comparables.length, view.price.searchedOn)}</p>
          {view.price.comparables.length > 0 && (
            <ul className="mt-1 flex flex-col">
              {view.price.comparables.map((c) => (
                <li key={c.url}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-h-11 items-center justify-between gap-3 py-1 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-accent underline">{c.title}</span>
                      <span className="block text-xs text-text-subtle">{[c.host, c.detail].filter(Boolean).join(" · ")}</span>
                    </span>
                    {c.priceText && <span className="shrink-0 font-mono font-medium">{c.priceText}</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-text-subtle">{t.publicReport.priceDisclaimer}</p>
        </Section>
      )}

      {view.photos && view.photos.length > 0 && (
        <Section title={t.publicReport.photos} aside={t.publicReport.photoCount(view.photos.length)}>
          <PhotoGallery photos={view.photos} />
          <p className="mt-2 text-xs text-text-subtle">{t.publicReport.tapToEnlarge}</p>
        </Section>
      )}

      {view.findings && (
        <Section title={t.publicReport.findings} aside={t.publicReport.findingCount(view.findings.length)}>
          {view.findings.length === 0 ? (
            <p className="text-sm text-text-muted">{t.publicReport.noFindings}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {view.findings.map((f, i) => (
                <li key={i} className="rounded-md border border-border p-3">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 type-caption-strong ${severityChip[f.severity]}`}>
                      {severityGlyph[f.severity]}
                      {f.severityLabel}
                    </span>
                    <p className="min-w-0">
                      <span className="font-semibold">{f.typeLabel}</span>
                      {f.location && <span className="text-text-muted"> · {f.location}</span>}
                    </p>
                  </div>
                  {f.note && <p className="mt-1 text-sm text-text-muted">{f.note}</p>}
                  {f.photoLabel && <p className="mt-1 text-xs text-text-subtle">{t.publicReport.seenIn(f.photoLabel)}</p>}
                </li>
              ))}
            </ul>
          )}
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
                <h3 className="type-overline uppercase tracking-[0.06em] text-text-subtle">{g.label}</h3>
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

      <p className="rounded-lg bg-surface-sunken p-4 text-center type-label text-text">{t.disclaimer}</p>

      <footer className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-text-subtle">{t.publicReport.inspectedBy}</p>
            <p className="font-semibold">{view.dealer.name}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
          <img src="/brand/treadmark-seal-olive.svg" alt="" width={64} height={64} className="size-16 shrink-0" />
        </div>
        {view.dealer.ownerName && <p className="text-text-muted">{view.dealer.ownerName}</p>}
        {place && <p className="text-text-muted">{place}</p>}
        {phone && <p className="text-text-muted">{phone}</p>}
        {pdfHref && (
          <a href={pdfHref} className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-md border border-button-secondary-border bg-button-secondary-bg type-title-sm text-button-secondary-fg active:bg-button-secondary-bg-hover">
            <DownloadIcon size={18} />
            {t.publicReport.downloadPdf}
          </a>
        )}
        {view.publishedOn && <p className="mt-2 text-xs text-text-subtle">{t.publicReport.publishedOn(view.publishedOn)}</p>}
        <p className="text-xs text-text-subtle">{t.publicReport.madeWith}</p>
      </footer>
    </div>
  );
}
