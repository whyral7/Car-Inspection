"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { AlertIcon, ArrowRightIcon, ChatIcon, CheckIcon, CopyIcon, DownloadIcon, ExternalIcon, RefreshIcon, SearchIcon, Spinner } from "@/components/icons";
import { RememberStep } from "@/components/remember-step";
import {
  Button,
  Card,
  CardHeader,
  ConfirmSheet,
  FormError,
  LinkButton,
  ProgressBar,
  StepHeader,
  StickyBar,
  Switch,
  buttonClass,
  useToast,
} from "@/components/ui";
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
  const [confirmPublish, setConfirmPublish] = useState(false);
  const toast = useToast();
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
      toast.show({ tone: "success", message: t.report.published });
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
      toast.show({ tone: "success", message: t.report.copied });
    } catch {
      toast.show({ tone: "error", message: t.report.errors.copy });
    }
  }

  const preview = applyHidden(view, hidden);
  const shareText = published ? t.report.shareMessage(view.car.title || view.car.regNumber, view.car.regNumber, view.scoreText, published.url) : "";
  const stage = searching === null ? 0 : PRICE_STAGES.filter((s) => searching >= s).length - 1;
  const canPublish = ready && !published;

  const stepLabels = [t.car.stepPhotos, t.car.stepFindings, t.car.stepChecklist, t.car.stepReport];
  return (
    <div className="flex flex-1 flex-col gap-6">
      <RememberStep carId={carId} step="report" />
      <StepHeader
        step={4}
        labels={stepLabels}
        stepLabel={t.common.stepOf(4, 4)}
        back={{ href: `/app/cars/${carId}`, label: t.report.backToCar }}
        title={published ? t.report.publishedTitle : t.report.previewTitle}
        meta={
          <>
            <span className="font-semibold tracking-wider text-ink tabular">{view.car.regNumber}</span>
            {view.car.title && ` · ${view.car.title}`}
          </>
        }
        description={published ? undefined : t.report.previewSubtitle}
      />

      {!ready && (
        <Card tone="warning" className="flex items-start gap-4">
          <AlertIcon className="mt-0.5 text-warning-700" />
          <p className="text-small text-warning-800">{t.report.notReady}</p>
        </Card>
      )}

      {unreviewed > 0 && (
        <Card tone="warning" className="flex flex-wrap items-center gap-4">
          <p className="min-w-0 flex-1 text-small text-warning-800">{t.report.unreviewed(unreviewed)}</p>
          <LinkButton href={`/app/cars/${carId}/findings`} variant="secondary" size="sm" className="shrink-0">
            {t.report.reviewNotes}
          </LinkButton>
        </Card>
      )}

      {published && (
        <Card as="section" className="flex animate-rise-in flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-700">
              <CheckIcon size={20} />
            </span>
            <div className="flex flex-col">
              <h2 className="font-semibold">{t.report.published}</h2>
              {view.publishedOn && <p className="text-small text-ink-muted">{t.report.publishedOn(view.publishedOn)}</p>}
            </div>
          </div>
          {/* What the buyer sees in WhatsApp before tapping the link. */}
          <figure className="overflow-hidden rounded-control bg-canvas ring-1 ring-line">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated link preview image */}
            <img src={`${reportPath(published.slug)}/og.png`} alt="" width={1200} height={630} loading="lazy" className="aspect-[1200/630] w-full bg-surface object-cover" />
            <figcaption className="px-4 py-2 text-caption text-ink-muted">{t.report.previewCard}</figcaption>
          </figure>
          <div className="grid grid-cols-2 gap-2">
            <ShareButton url={published.url} title={shareText} text={shareText} label={t.report.shareOther} className={buttonClass("secondary", "", false, "sm")} />
            <Button variant="secondary" size="sm" onClick={onCopy} icon={<CopyIcon size={18} />}>
              {t.report.copyLink}
            </Button>
            <a href={reportPath(published.slug)} target="_blank" rel="noopener" className={buttonClass("secondary", "", false, "sm")}>
              <ExternalIcon size={18} />
              {t.report.openReport}
            </a>
            <a href={reportPdfPath(published.slug)} className={buttonClass("secondary", "", false, "sm")}>
              <DownloadIcon size={18} />
              {t.report.downloadPdf}
            </a>
          </div>
          <label className="flex flex-col gap-2 text-small font-medium">
            {t.report.link}
            <input
              readOnly
              value={published.url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-h-12 rounded-control bg-sunken px-4 text-body font-normal text-ink-muted tabular focus:shadow-focus focus:outline-none"
            />
          </label>
          <p className="text-caption text-ink-muted">
            {t.report.liveHint} {t.report.pdfHint}
          </p>
        </Card>
      )}

      <Card as="section">
        <CardHeader
          title={t.report.sectionsTitle}
          aside={
            sectionsSave === "saving" ? (
              <span className="inline-flex items-center gap-1.5 text-caption">
                <Spinner className="size-3.5" />
                {t.report.savingSections}
              </span>
            ) : sectionsSave === "saved" ? (
              <span className="inline-flex animate-fade-in items-center gap-1 text-caption font-medium text-success-700">
                <CheckIcon size={14} />
                {t.report.sectionsSaved}
              </span>
            ) : null
          }
        />
        <ul className="-my-2 divide-y divide-line">
          {REPORT_SECTIONS.filter((section) => section !== "price" || view.price).map((section) => {
            const shown = !hidden.includes(section);
            return (
              <li key={section}>
                <Switch checked={shown} onChange={() => toggle(section)} label={t.report.sections[section]} description={shown ? t.report.shownToBuyers : t.report.hiddenFromBuyers} />
              </li>
            );
          })}
        </ul>
        {sectionsSave === "error" && (
          <div className="mt-4">
            <FormError message={t.report.errors.sections} />
          </div>
        )}
      </Card>

      <Card as="section" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-heading">{t.report.price.title}</h2>
          {view.price ? (
            <>
              <p className="text-title tabular">{view.price.rangeText}</p>
              <p className="text-caption text-ink-muted">
                {view.price.searchedOn} · {hidden.includes("price") ? t.report.price.hiddenOnReport : t.report.price.shownOnReport}
              </p>
            </>
          ) : (
            <p className="text-small text-ink-muted">{t.report.price.intro}</p>
          )}
        </div>
        {searching !== null ? (
          <div role="status" className="flex animate-rise-in flex-col gap-2 rounded-control bg-brand-50 p-4">
            <p className="flex items-center gap-2 text-small font-medium text-brand-900">
              <Spinner className="text-brand-700" />
              {t.report.price.stages[stage]}
            </p>
            <ProgressBar value={Math.min(57, searching)} max={60} label={t.report.price.stages[stage]} size="sm" className="!bg-surface" />
            <p className="text-caption text-brand-900 tabular">{t.report.price.elapsed(searching)}</p>
          </div>
        ) : (
          <Button variant={view.price ? "secondary" : "primary"} onClick={onEstimate} disabled={searchesLeft < 1} icon={view.price ? <RefreshIcon size={18} /> : <SearchIcon size={18} />}>
            {view.price ? t.report.price.refresh : t.report.price.run}
          </Button>
        )}
        {searching === null && (
          <p className="text-center text-caption text-ink-muted">
            {searchesLeft < 1 ? t.report.price.errors.limit(PRICE.maxPerCarPerDay) : t.report.price.left(searchesLeft, PRICE.maxPerCarPerDay)}
          </p>
        )}
        <FormError message={priceError} />
      </Card>

      <section aria-label={t.report.previewLabel} className="flex flex-col gap-4 rounded-sheet bg-sunken p-2 sm:p-4">
        <p className="pt-2 text-center text-caption font-semibold tracking-wide text-ink-muted uppercase">{t.report.previewLabel}</p>
        <div className="overflow-hidden rounded-card bg-canvas px-4 py-4 shadow-card">
          <ReportView view={preview} t={t} pdfHref={null} />
          <div className="mt-4">
            <ContactButtons view={preview} t={t} preview />
          </div>
        </div>
      </section>

      <ConfirmSheet
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        title={t.report.publishConfirm}
        description={t.report.publishCost(credits)}
        confirmLabel={t.report.publish}
        cancelLabel={t.common.cancel}
        closeLabel={t.common.close}
        variant="primary"
        errorFallback={t.report.errors.publish}
        onConfirm={() => {
          void onPublish();
        }}
      />

      <StickyBar>
        {canPublish ? (
          outOfCredits ? (
            <>
              <p className="text-center text-small font-medium text-warning-700">{t.report.noCredits}</p>
              <LinkButton href={`/app/credits?next=${encodeURIComponent(`/app/cars/${carId}/report`)}`}>
                {t.report.buyCredits}
                <ArrowRightIcon size={20} />
              </LinkButton>
            </>
          ) : (
            <>
              {publishError && <FormError message={publishError} />}
              <Button onClick={() => setConfirmPublish(true)} loading={publishing}>
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
