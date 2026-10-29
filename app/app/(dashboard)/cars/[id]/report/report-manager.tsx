"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BackLink, Button, LinkButton, StickyBar, buttonClass } from "@/components/ui";
import { FormError } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import { AlertIcon, ChatIcon, CheckIcon, CopyIcon, DownloadIcon, ExternalIcon, RefreshIcon, SearchIcon } from "@/components/icons";
import { ContactButtons, ReportView } from "@/components/report/report-view";
import { ShareButton } from "@/components/report/share-button";
import { PRICE } from "@/lib/config";
import { reportPdfPath, reportPath, whatsappShareUrl } from "@/lib/report/share";
import { REPORT_SECTIONS, applyHidden, type ReportSection, type ReportView as View } from "@/lib/report/view";
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
  /** Price searches still allowed for this car today. */
  searchesLeft: number;
};

/** Seconds after which the price search shows its next step, so a minute-long wait shows progress. */
const PRICE_STAGES = [0, 10, 25] as const;

export function ReportManager({ carId, ready, unreviewed, credits, view, initialHidden, published, searchesLeft }: Props) {
  const t = useT();
  const router = useRouter();
  const [hidden, setHidden] = useState<ReportSection[]>(initialHidden);
  const [sectionsSave, setSectionsSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(credits < 1);
  const [copied, setCopied] = useState<"idle" | "done" | "error">("idle");
  const [priceError, setPriceError] = useState<string | null>(null);
  // Seconds since the price search started, or null when not searching.
  const [searching, setSearching] = useState<number | null>(null);
  // Saves run one after another, always sending the latest choice.
  const latest = useRef(hidden);
  const chain = useRef(Promise.resolve());

  useEffect(() => {
    if (searching === null) return;
    const id = setTimeout(() => setSearching((s) => (s === null ? null : s + 1)), 1000);
    return () => clearTimeout(id);
  }, [searching]);

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
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    } catch {
      setPublishError(navigator.onLine ? t.report.errors.publish : t.common.offline);
    } finally {
      setPublishing(false);
    }
  }

  async function onEstimate() {
    setPriceError(null);
    setSearching(0);
    try {
      const res = await estimatePrice(carId);
      if (res.ok) router.refresh();
      else setPriceError(res.error);
    } catch {
      setPriceError(navigator.onLine ? t.report.price.errors.failed : t.common.offline);
    } finally {
      setSearching(null);
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
  const stage = searching === null ? 0 : PRICE_STAGES.filter((s) => searching >= s).length - 1;
  const canPublish = ready && !published;

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/app/cars/${carId}`}>{t.report.backToCar}</BackLink>

      <header>
        <h1 className="text-title font-bold">{published ? t.report.publishedTitle : t.report.previewTitle}</h1>
        <p className="text-small text-ink-muted">
          <span className="font-semibold tracking-wider">{view.car.regNumber}</span>
          {view.car.title && ` · ${view.car.title}`}
        </p>
        {!published && <p className="mt-2 text-small text-ink-muted">{t.report.previewSubtitle}</p>}
      </header>

      {!ready && (
        <section className="flex items-start gap-3 rounded-card border border-warning-200 bg-warning-50 p-4">
          <AlertIcon className="mt-0.5 text-warning-800" />
          <p className="text-small text-warning-800">{t.report.notReady}</p>
        </section>
      )}

      {unreviewed > 0 && (
        <section className="flex flex-wrap items-center gap-3 rounded-card border border-warning-200 bg-warning-50 p-4">
          <p className="min-w-0 flex-1 text-small text-warning-800">{t.report.unreviewed(unreviewed)}</p>
          <LinkButton href={`/app/cars/${carId}/findings`} variant="secondary" className="min-h-11 shrink-0 px-3 text-small">
            {t.report.reviewNotes}
          </LinkButton>
        </section>
      )}

      {published && (
        <section className="flex flex-col gap-3 rounded-card border border-brand-200 bg-surface p-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-brand-800">
              <CheckIcon size={18} />
              {t.report.published}
            </h2>
            {view.publishedOn && <p className="text-small text-ink-muted">{t.report.publishedOn(view.publishedOn)}</p>}
          </div>
          {/* What the buyer sees in WhatsApp before tapping the link. */}
          <figure className="overflow-hidden rounded-control border border-line bg-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated link preview image */}
            <img src={`${reportPath(published.slug)}/og.png`} alt="" width={1200} height={630} loading="lazy" className="aspect-[1200/630] w-full bg-surface object-cover" />
            <figcaption className="px-3 py-2 text-caption text-ink-muted">{t.report.previewCard}</figcaption>
          </figure>
          <a href={whatsappShareUrl(shareText)} target="_blank" rel="noopener" className={buttonClass("primary")}>
            <ChatIcon />
            {t.report.shareWhatsApp}
          </a>
          <div className="grid grid-cols-2 gap-2">
            <ShareButton url={published.url} title={shareText} text={shareText} label={t.report.shareOther} className={buttonClass("secondary", "px-3 text-small")} />
            <Button variant="secondary" onClick={onCopy} className="px-3 text-small">
              {copied === "done" ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
              {copied === "done" ? t.report.copied : t.report.copyLink}
            </Button>
            <a href={reportPath(published.slug)} target="_blank" rel="noopener" className={buttonClass("secondary", "px-3 text-small")}>
              <ExternalIcon size={18} />
              {t.report.openReport}
            </a>
            <a href={reportPdfPath(published.slug)} className={buttonClass("secondary", "px-3 text-small")}>
              <DownloadIcon size={18} />
              {t.report.downloadPdf}
            </a>
          </div>
          <label className="flex flex-col gap-1 text-small font-medium text-ink">
            {t.report.link}
            <input readOnly value={published.url} onFocus={(e) => e.currentTarget.select()} className="min-h-11 rounded-control border border-line bg-surface px-3 text-body font-normal" />
          </label>
          {copied === "error" && <FormError message={t.report.errors.copy} />}
          <p className="text-caption text-ink-muted">
            {t.report.liveHint} {t.report.pdfHint}
          </p>
        </section>
      )}

      <section className="rounded-card border border-line bg-surface p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="font-semibold">{t.report.sectionsTitle}</h2>
          {sectionsSave === "saving" && <p className="text-caption text-ink-muted">{t.report.savingSections}</p>}
          {sectionsSave === "saved" && <p className="text-caption font-medium text-brand-800">{t.report.sectionsSaved}</p>}
        </div>
        <ul className="divide-y divide-line">
          {REPORT_SECTIONS.filter((section) => section !== "price" || view.price).map((section) => {
            const shown = !hidden.includes(section);
            return (
              <li key={section}>
                <button type="button" role="switch" aria-checked={shown} onClick={() => toggle(section)} className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left">
                  <span>
                    <span className="block font-medium">{t.report.sections[section]}</span>
                    <span className={`block text-caption font-medium ${shown ? "text-ink-muted" : "text-warning-800"}`}>{shown ? t.report.shownToBuyers : t.report.hiddenFromBuyers}</span>
                  </span>
                  <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${shown ? "bg-brand-700" : "bg-slate-400"}`}>
                    <span className={`absolute top-0.5 size-6 rounded-full bg-surface shadow transition-transform ${shown ? "translate-x-5.5" : "translate-x-0.5"}`} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {sectionsSave === "error" && <FormError message={t.report.errors.sections} />}
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        <div>
          <h2 className="font-semibold">{t.report.price.title}</h2>
          {view.price ? (
            <>
              <p className="mt-1 text-title font-bold">{view.price.rangeText}</p>
              <p className="text-caption text-ink-muted">
                {view.price.searchedOn} · {hidden.includes("price") ? t.report.price.hiddenOnReport : t.report.price.shownOnReport}
              </p>
            </>
          ) : (
            <p className="mt-1 text-small text-ink-muted">{t.report.price.intro}</p>
          )}
        </div>
        {searching !== null ? (
          <div role="status" className="flex flex-col gap-2 rounded-control bg-brand-50 p-3">
            <p className="flex items-center gap-3 text-small font-medium text-brand-900">
              <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
              {t.report.price.stages[stage]}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-brand-600 transition-[width] duration-1000" style={{ width: `${Math.min(95, (searching / 60) * 100)}%` }} />
            </div>
            <p className="text-caption text-brand-900">{t.report.price.elapsed(searching)}</p>
          </div>
        ) : (
          <Button variant={view.price ? "secondary" : "primary"} onClick={onEstimate} disabled={searchesLeft < 1}>
            {view.price ? <RefreshIcon size={18} /> : <SearchIcon size={18} />}
            {view.price ? t.report.price.refresh : t.report.price.run}
          </Button>
        )}
        {searching === null && <p className="text-center text-caption text-ink-muted">{searchesLeft < 1 ? t.report.price.errors.limit(PRICE.maxPerCarPerDay) : t.report.price.left(searchesLeft, PRICE.maxPerCarPerDay)}</p>}
        <FormError message={priceError} />
      </section>

      <section aria-label={t.report.previewLabel} className="rounded-card border-2 border-dashed border-line bg-canvas p-3">
        <p className="mb-3 text-center text-caption font-semibold tracking-wide text-ink-muted uppercase">{t.report.previewLabel}</p>
        <ReportView view={preview} t={t} pdfHref={null} />
        <div className="mt-4">
          <ContactButtons view={preview} t={t} preview />
        </div>
      </section>

      <StickyBar>
        {canPublish ? (
          outOfCredits ? (
            <>
              <p className="text-center text-small font-medium text-warning-800">{t.report.noCredits}</p>
              <LinkButton href={`/app/credits?next=${encodeURIComponent(`/app/cars/${carId}/report`)}`}>{t.report.buyCredits}</LinkButton>
            </>
          ) : (
            <>
              {publishError && <FormError message={publishError} />}
              <Button onClick={onPublish} loading={publishing}>
                {publishing ? t.report.publishing : t.report.publish}
              </Button>
              <p className="text-center text-caption text-ink-muted">{t.report.publishCost(credits)}</p>
            </>
          )
        ) : published ? (
          <a href={whatsappShareUrl(shareText)} target="_blank" rel="noopener" className={buttonClass("primary")}>
            <ChatIcon />
            {t.report.shareWhatsApp}
          </a>
        ) : (
          <LinkButton href={`/app/cars/${carId}`} variant="secondary">
            {t.report.goToInspection}
          </LinkButton>
        )}
      </StickyBar>
    </div>
  );
}
