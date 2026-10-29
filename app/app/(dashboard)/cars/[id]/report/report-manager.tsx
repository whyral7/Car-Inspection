"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, LinkButton, buttonClass } from "@/components/button";
import { FormError } from "@/components/field";
import { ContactButtons, ReportView } from "@/components/report/report-view";
import { reportPdfPath, reportPath, whatsappShareUrl } from "@/lib/report/share";
import { REPORT_SECTIONS, applyHidden, type ReportSection, type ReportView as View } from "@/lib/report/view";
import { PRICE } from "@/lib/config";
import { useT } from "@/components/i18n-provider";
import { estimatePrice, publishReport, saveHiddenSections } from "./actions";

type Props = {
  carId: string;
  /** The inspection is finished (car is inspected or published). */
  ready: boolean;
  unreviewed: number;
  credits: number;
  view: View;
  initialHidden: ReportSection[];
  published: { slug: string; url: string } | null;
};

export function ReportManager({ carId, ready, unreviewed, credits, view, initialHidden, published }: Props) {
  const t = useT();
  const router = useRouter();
  const [hidden, setHidden] = useState<ReportSection[]>(initialHidden);
  const [sectionsSave, setSectionsSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(credits < 1);
  const [copied, setCopied] = useState<"idle" | "done" | "error">("idle");
  const [estimating, setEstimating] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  // Saves run one after another, always sending the latest choice.
  const latest = useRef(hidden);
  const chain = useRef(Promise.resolve());

  function toggle(section: ReportSection) {
    const next = hidden.includes(section) ? hidden.filter((s) => s !== section) : [...hidden, section];
    latest.current = next;
    setHidden(next);
    if (!published) return;
    setSectionsSave("saving");
    chain.current = chain.current.then(async () => {
      if (latest.current !== next) return;
      try {
        const res = await saveHiddenSections(carId, next);
        if (latest.current === next) setSectionsSave(res.ok ? "saved" : "error");
      } catch {
        if (latest.current === next) setSectionsSave("error");
      }
    });
  }

  async function onPublish() {
    setPublishError(null);
    setPublishing(true);
    try {
      const res = await publishReport(carId, hidden);
      if (!res.ok) {
        if (res.code === "no_credits") setOutOfCredits(true);
        setPublishError(res.error);
        return;
      }
      router.refresh();
    } catch {
      setPublishError(navigator.onLine ? t.report.errors.publish : t.common.offline);
    } finally {
      setPublishing(false);
    }
  }

  async function onEstimate() {
    setPriceError(null);
    setEstimating(true);
    try {
      const res = await estimatePrice(carId);
      if (res.ok) router.refresh();
      else setPriceError(res.error);
    } catch {
      setPriceError(navigator.onLine ? t.report.price.errors.failed : t.common.offline);
    } finally {
      setEstimating(false);
    }
  }

  async function onCopy() {
    if (!published) return;
    try {
      await navigator.clipboard.writeText(published.url);
      setCopied("done");
    } catch {
      setCopied("error");
    }
  }

  const preview = applyHidden(view, hidden);
  const shareText = published ? t.report.shareMessage(view.car.title || view.car.regNumber, view.car.regNumber, view.scoreText, published.url) : "";

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/app/cars/${carId}`} className="-ml-1 inline-flex min-h-11 items-center self-start px-1 text-sm font-medium text-brand-700">
        ← {t.report.backToCar}
      </Link>

      <header>
        <h1 className="text-xl font-bold">{published ? t.report.publishedTitle : t.report.previewTitle}</h1>
        <p className="text-sm text-slate-600">
          <span className="font-semibold tracking-wider">{view.car.regNumber}</span>
          {view.car.title && ` · ${view.car.title}`}
        </p>
        {!published && <p className="mt-2 text-sm text-slate-600">{t.report.previewSubtitle}</p>}
      </header>

      {!ready && (
        <section className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">{t.report.notReady}</p>
          <LinkButton href={`/app/cars/${carId}`} variant="secondary">
            {t.report.goToInspection}
          </LinkButton>
        </section>
      )}

      {unreviewed > 0 && (
        <section className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="flex-1 text-sm text-amber-900">{t.report.unreviewed(unreviewed)}</p>
          <LinkButton href={`/app/cars/${carId}/findings`} variant="secondary" className="min-h-11 shrink-0 px-3 text-sm">
            {t.report.reviewNotes}
          </LinkButton>
        </section>
      )}

      {published && (
        <section className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <div>
            <h2 className="font-semibold text-brand-800">✓ {t.report.published}</h2>
            {view.publishedOn && <p className="text-sm text-slate-600">{t.report.publishedOn(view.publishedOn)}</p>}
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t.report.link}
            <input readOnly value={published.url} onFocus={(e) => e.currentTarget.select()} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base font-normal" />
          </label>
          <a href={whatsappShareUrl(shareText)} target="_blank" rel="noopener" className={buttonClass("primary", "bg-[#128c7e] active:bg-[#075e54]")}>
            <span aria-hidden="true">💬</span>
            {t.report.shareWhatsApp}
          </a>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onCopy} className="px-3 text-sm">
              {copied === "done" ? `✓ ${t.report.copied}` : t.report.copyLink}
            </Button>
            <a href={reportPath(published.slug)} target="_blank" rel="noopener" className={buttonClass("secondary", "px-3 text-sm")}>
              {t.report.openReport}
            </a>
          </div>
          <a href={reportPdfPath(published.slug)} className={buttonClass("secondary", "text-sm")}>
            ⬇ {t.report.downloadPdf}
          </a>
          {copied === "error" && <FormError message={t.report.errors.copy} />}
          <p className="text-xs text-slate-600">
            {t.report.liveHint} {t.report.pdfHint}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <h2 className="font-semibold">{t.report.price.title}</h2>
          {view.price ? (
            <>
              <p className="mt-1 text-2xl font-bold">{view.price.rangeText}</p>
              <p className="text-xs text-slate-500">
                {view.price.searchedOn} · {hidden.includes("price") ? t.report.price.hiddenOnReport : t.report.price.shownOnReport}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-600">{t.report.price.intro}</p>
          )}
        </div>
        {estimating ? (
          <p role="status" className="flex items-center gap-3 text-sm text-slate-700">
            <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
            {t.report.price.running}
          </p>
        ) : (
          <Button variant={view.price ? "secondary" : "primary"} onClick={onEstimate}>
            {view.price ? t.report.price.refresh : t.report.price.run}
          </Button>
        )}
        {!view.price && !estimating && <p className="text-center text-xs text-slate-500">{t.report.price.free(PRICE.maxPerCarPerDay)}</p>}
        <FormError message={priceError} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">{t.report.sectionsTitle}</h2>
          {sectionsSave === "saving" && <p className="text-xs text-slate-500">{t.report.savingSections}</p>}
          {sectionsSave === "saved" && <p className="text-xs text-brand-800">{t.report.sectionsSaved}</p>}
        </div>
        <ul className="divide-y divide-slate-100">
          {REPORT_SECTIONS.filter((section) => section !== "price" || view.price).map((section) => {
            const shown = !hidden.includes(section);
            return (
              <li key={section}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={shown}
                  onClick={() => toggle(section)}
                  className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left"
                >
                  <span>
                    <span className="block font-medium">{t.report.sections[section]}</span>
                    <span className={`block text-xs ${shown ? "text-slate-500" : "text-amber-800"}`}>{shown ? t.report.shownToBuyers : t.report.hiddenFromBuyers}</span>
                  </span>
                  <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${shown ? "bg-brand-700" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${shown ? "translate-x-5.5" : "translate-x-0.5"}`} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {sectionsSave === "error" && <FormError message={t.report.errors.sections} />}
      </section>

      {ready && !published && (
        <section className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          {outOfCredits ? (
            <>
              <p className="text-sm font-medium text-amber-900">{t.report.noCredits}</p>
              <LinkButton href={`/app/credits?next=${encodeURIComponent(`/app/cars/${carId}/report`)}`}>{t.report.buyCredits}</LinkButton>
            </>
          ) : (
            <>
              <Button onClick={onPublish} loading={publishing}>
                {publishing ? t.report.publishing : t.report.publish}
              </Button>
              <p className="text-center text-sm text-slate-500">{t.report.publishCost(credits)}</p>
            </>
          )}
          {publishError && !outOfCredits && <FormError message={publishError} />}
        </section>
      )}

      <section aria-label={t.report.previewLabel} className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-3">
        <p className="mb-3 text-center text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.report.previewLabel}</p>
        <ReportView view={preview} t={t} pdfHref={null} />
        <div className="mt-4">
          <ContactButtons view={preview} t={t} preview />
        </div>
      </section>
    </div>
  );
}
