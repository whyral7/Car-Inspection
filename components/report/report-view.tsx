// The report body shared by the public page (/r/[slug]) and the dealer's preview. No hooks, so it
// renders on the server for buyers and in the browser for the live preview.
import type { ReactNode } from "react";
import { PhotoGallery } from "@/components/report/photo-gallery";
import { formatPhone, telHref, whatsappChatUrl } from "@/lib/report/share";
import type { DetailRow, ReportCheckItem, ReportView as View } from "@/lib/report/view";
import type { ScoreBand } from "@/lib/score";
import { t } from "@/lib/strings";
import type { ChecklistResult, Severity } from "@/lib/supabase/database.types";

const bandStyle: Record<ScoreBand, string> = {
  good: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  fair: "bg-amber-50 text-amber-800 ring-amber-200",
  poor: "bg-red-50 text-red-800 ring-red-200",
};
const severityChip: Record<Severity, string> = {
  minor: "bg-amber-100 text-amber-900",
  moderate: "bg-orange-100 text-orange-900",
  major: "bg-red-100 text-red-800",
};
const severityEdge: Record<Severity, string> = {
  minor: "border-l-amber-400",
  moderate: "border-l-orange-500",
  major: "border-l-red-600",
};
const resultChip: Record<ChecklistResult, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  attention: "bg-amber-100 text-amber-900",
  fail: "bg-red-100 text-red-800",
  na: "bg-slate-100 text-slate-700",
};

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {aside && <p className="text-right text-sm text-slate-500">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function Details({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4 py-2 text-sm">
          <dt className="text-slate-600">{row.label}</dt>
          <dd className={`text-right font-medium ${row.warn ? "text-red-700" : ""}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CheckList({ items }: { items: ReportCheckItem[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.key} className="flex items-start gap-3 py-2">
          <span className={`mt-0.5 w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold ${resultChip[item.result]}`}>{item.resultLabel}</span>
          <span className="min-w-0 text-sm">
            <span className="block">{item.label}</span>
            {item.note && <span className="block text-slate-600">{item.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ScoreBadge({ view, className = "" }: { view: Pick<View, "scoreText" | "band">; className?: string }) {
  return (
    <div className={`flex shrink-0 flex-col items-center rounded-2xl px-4 py-3 ring-1 ${bandStyle[view.band]} ${className}`}>
      <span className="text-xs font-semibold">{t.publicReport.score}</span>
      <span className="text-4xl leading-tight font-bold">
        {view.scoreText}
        <span className="text-base font-medium opacity-70">{t.publicReport.outOf}</span>
      </span>
      <span className="text-xs font-semibold">{t.publicReport.bands[view.band]}</span>
    </div>
  );
}

/** "Call dealer" and "WhatsApp dealer" (or owner). In the sharer's own preview they are shown but do nothing. */
export function ContactButtons({ view, preview = false }: { view: View; preview?: boolean }) {
  const { userType, phone } = view.dealer;
  const message = t.publicReport.contactMessage(view.car.title || view.car.regNumber, view.car.regNumber, userType !== "buyer");
  const call = telHref(phone);
  const chat = whatsappChatUrl(phone, message);
  if (!call || !chat) return null;
  const labels = t.publicReport.contact[userType];
  const base = "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-base font-semibold";
  const buttons = [
    { href: call, label: labels.call, icon: "📞", style: "border border-slate-300 bg-white text-slate-900 active:bg-slate-100" },
    { href: chat, label: labels.whatsapp, icon: "💬", style: "bg-[#128c7e] text-white active:bg-[#075e54]" },
  ];
  return (
    <div className="flex gap-2">
      {buttons.map((b) =>
        preview ? (
          <span key={b.label} aria-disabled="true" className={`${base} ${b.style}`}>
            <span aria-hidden="true">{b.icon}</span>
            {b.label}
          </span>
        ) : (
          <a key={b.label} href={b.href} className={`${base} ${b.style}`} {...(b.href.startsWith("https:") ? { target: "_blank", rel: "noopener" } : {})}>
            <span aria-hidden="true">{b.icon}</span>
            {b.label}
          </a>
        ),
      )}
    </div>
  );
}

export function ReportView({ view, pdfHref }: { view: View; pdfHref?: string | null }) {
  const phone = formatPhone(view.dealer.phone);
  const place = [view.dealer.address, view.dealer.city].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        {view.dealer.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small public logo, no need for the image optimiser
          <img src={view.dealer.logoUrl} alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl border border-slate-200 bg-white object-contain" />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-lg font-bold text-white">{view.dealer.name.charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{view.dealer.name}</p>
          {view.dealer.city && <p className="truncate text-sm text-slate-600">{view.dealer.city}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">{t.publicReport.heading}</span>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-block rounded-md border-2 border-slate-900 px-2 py-0.5 text-lg font-bold tracking-widest">{view.car.regNumber}</p>
            <h1 className="mt-2 text-xl leading-snug font-bold">{view.car.title}</h1>
          </div>
          <ScoreBadge view={view} />
        </div>
        {view.car.details.length > 0 && (
          <div className="mt-3">
            <Details rows={view.car.details} />
          </div>
        )}
      </section>

      {view.photos && view.photos.length > 0 && (
        <Section title={t.publicReport.photos} aside={t.publicReport.photoCount(view.photos.length)}>
          <PhotoGallery photos={view.photos} />
          <p className="mt-2 text-xs text-slate-500">{t.publicReport.tapToEnlarge}</p>
        </Section>
      )}

      {view.findings && (
        <Section title={t.publicReport.findings} aside={t.publicReport.findingCount(view.findings.length)}>
          {view.findings.length === 0 ? (
            <p className="text-sm text-slate-600">{t.publicReport.noFindings}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {view.findings.map((f, i) => (
                <li key={i} className={`rounded-lg border border-l-4 border-slate-200 p-3 ${severityEdge[f.severity]}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${severityChip[f.severity]}`}>{f.severityLabel}</span>
                    <p className="min-w-0">
                      <span className="font-semibold">{f.typeLabel}</span>
                      {f.location && <span className="text-slate-700"> · {f.location}</span>}
                    </p>
                  </div>
                  {f.note && <p className="mt-1 text-sm text-slate-700">{f.note}</p>}
                  {f.photoLabel && <p className="mt-1 text-xs text-slate-500">{t.publicReport.seenIn(f.photoLabel)}</p>}
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
                <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{g.label}</h3>
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

      <p className="rounded-2xl bg-slate-100 p-4 text-center text-sm font-semibold text-slate-800">{t.disclaimer}</p>

      <footer className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <p className="text-slate-500">{t.publicReport.inspectedBy}</p>
        <p className="font-semibold">{view.dealer.name}</p>
        {view.dealer.ownerName && <p className="text-slate-700">{view.dealer.ownerName}</p>}
        {place && <p className="text-slate-700">{place}</p>}
        {phone && <p className="text-slate-700">{phone}</p>}
        {pdfHref && (
          <a href={pdfHref} className="mt-2 flex min-h-12 items-center justify-center rounded-xl border border-slate-300 font-semibold text-brand-800 active:bg-slate-100">
            ⬇ {t.publicReport.downloadPdf}
          </a>
        )}
        {view.publishedOn && <p className="mt-2 text-xs text-slate-500">{t.publicReport.publishedOn(view.publishedOn)}</p>}
        <p className="text-xs text-slate-500">{t.publicReport.madeWith}</p>
      </footer>
    </div>
  );
}
