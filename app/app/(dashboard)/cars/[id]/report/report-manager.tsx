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
  inputClass,
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
      window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
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
            <span className="type-code-strong tracking-[var(--tracking-wide)] text-text">{view.car.regNumber}</span>
            {view.car.title && ` · ${view.car.title}`}
          </>
        }
        description={published ? undefined : t.report.previewSubtitle}
      />

      {!ready && (
        <Card tone="brand" className="flex items-start gap-4">
          <AlertIcon className="mt-0.5" />
          <p className="type-body-sm">{t.report.notReady}</p>
        </Card>
      )}

      {unreviewed > 0 && (
        <Card tone="brand" className="flex flex-wrap items-center gap-4">
          <p className="min-w-0 flex-1 type-body-sm">{t.report.unreviewed(unreviewed)}</p>
          <LinkButton href={`/app/cars/${carId}/findings`} variant="secondary" size="sm" className="shrink-0">
            {t.report.reviewNotes}
          </LinkButton>
        </Card>
      )}

      {published && (
        <Card as="section" className="flex animate-rise-in flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-text">
              <CheckIcon size={20} />
            </span>
            <div className="flex flex-col">
              <h2 className="type-title-sm">{t.report.published}</h2>
              {view.publishedOn && <p className="type-body-sm text-text-muted">{t.report.publishedOn(view.publishedOn)}</p>}
            </div>
          </div>
          {/* What the buyer sees in WhatsApp before tapping the link. */}
          <figure className="overflow-hidden rounded-md border border-border bg-bg">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated link preview image */}
            <img src={`${reportPath(published.slug)}/og.png`} alt="" width={1200} height={630} loading="lazy" className="aspect-[1200/630] w-full bg-surface object-cover" />
            <figcaption className="px-4 py-2 type-caption text-text-muted">{t.report.previewCard}</figcaption>
          </figure>
          <div className="grid grid-cols-2 gap-2">
            <ShareButton url={published.url} title={shareText} text={shareText} label={t.report.shareOther} className={buttonClass("secondary", "!px-2", false, "sm")} />
            <Button variant="secondary" size="sm" onClick={onCopy} icon={<CopyIcon size={18} />} className="!px-2">
              {t.report.copyLink}
            </Button>
            <a href={reportPath(published.slug)} target="_blank" rel="noopener" className={buttonClass("secondary", "!px-2", false, "sm")}>
              <ExternalIcon size={18} />
              {t.report.openReport}
            </a>
            <a href={reportPdfPath(published.slug)} className={buttonClass("secondary", "!px-2", false, "sm")}>
              <DownloadIcon size={18} />
              {t.report.downloadPdf}
            </a>
          </div>
          <label className="flex flex-col gap-[var(--field-gap)] type-label">
            {t.report.link}
            <input
              readOnly
              value={published.url}
              onFocus={(e) => e.currentTarget.select()}
              className={`${inputClass} bg-input-disabled-bg font-mono text-text-muted`}
            />
          </label>
          <p className="type-caption text-text-muted">
            {t.report.liveHint} {t.report.pdfHint}
          </p>
        </Card>
      )}

      <Card as="section">
        <CardHeader
          title={t.report.sectionsTitle}
          aside={
            sectionsSave === "saving" ? (
              <span className="inline-flex items-center gap-1.5 type-caption">
                <Spinner className="size-3.5" />
                {t.report.savingSections}
              </span>
            ) : sectionsSave === "saved" ? (
              <span className="inline-flex animate-fade-in items-center gap-1 type-caption-strong text-text-muted">
                <CheckIcon size={14} />
                {t.report.sectionsSaved}
              </span>
            ) : null
          }
        />
        <ul className="-my-2 divide-y divide-border">
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
          <h2 className="type-heading-2">{t.report.price.title}</h2>
          {view.price ? (
            <>
              <p className="type-heading-1 tabular">{view.price.rangeText}</p>
              <p className="type-caption text-text-muted">
                {view.price.searchedOn} · {hidden.includes("price") ? t.report.price.hiddenOnReport : t.report.price.shownOnReport}
              </p>
            </>
          ) : (
            <p className="type-body-sm text-text-muted">{t.report.price.intro}</p>
          )}
        </div>
        {searching !== null ? (
          <div role="status" className="flex animate-rise-in flex-col gap-2 rounded-md bg-accent-tint p-4">
            <p className="flex items-center gap-2 type-label text-accent-hover">
              <Spinner />
              {t.report.price.stages[stage]}
            </p>
            <ProgressBar value={Math.min(57, searching)} max={60} label={t.report.price.stages[stage]} size="sm" className="!bg-surface" />
            <p className="type-caption text-accent-hover tabular">{t.report.price.elapsed(searching)}</p>
          </div>
        ) : (
          <Button variant={view.price ? "secondary" : "primary"} onClick={onEstimate} disabled={searchesLeft < 1} icon={view.price ? <RefreshIcon size={18} /> : <SearchIcon size={18} />}>
            {view.price ? t.report.price.refresh : t.report.price.run}
          </Button>
        )}
        {searching === null && (
          <p className="text-center type-caption text-text-muted">
            {searchesLeft < 1 ? t.report.price.errors.limit(PRICE.maxPerCarPerDay) : t.report.price.left(searchesLeft, PRICE.maxPerCarPerDay)}
          </p>
        )}
        <FormError message={priceError} />
      </Card>

      {/* The buyer's view, set off by a dashed rule rather than another box around the report's own cards. */}
      <section aria-label={t.report.previewLabel} className="flex flex-col gap-4 border-t border-dashed border-border-control pt-4">
        <p className="caps text-center type-overline text-text-muted">{t.report.previewLabel}</p>
        <div>
          <ReportView view={preview} t={t} pdfHref={null} titleAs="h2" />
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
              <p className="text-center type-label">{t.report.noCredits}</p>
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
              <p className="text-center type-body-sm text-text-muted">{t.report.publishCost(credits)}</p>
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
