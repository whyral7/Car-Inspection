import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BottomBar } from "@/components/bottom-bar";
import { Button } from "@/components/button";
import { Field, FormError, SelectField } from "@/components/field";
import { LanguageToggle } from "@/components/language-toggle";
import { RedFlag } from "@/components/red-flag";
import { ScoreBadge } from "@/components/report/report-view";
import { VerdictBadge, resultVerdict, severityVerdict } from "@/components/verdict-badge";
import { getT } from "@/lib/i18n.server";
import { formatScore, scoreBand } from "@/lib/score";
import type { Strings } from "@/lib/strings";
import { RatingDemo } from "./rating-demo";

// The brand at a glance for whoever builds screens: every shared component in every state, light and dark,
// in the reader's language (use the toggle for Hindi). Off in production unless SHOW_BRAND_PAGE=1.

export const metadata: Metadata = { title: "Brand", robots: { index: false, follow: false } };

const COLOURS = [
  "bg", "surface", "surface-sunken", "border", "border-control", "text", "text-muted", "text-subtle",
  "accent", "accent-tint", "highlight", "pass", "attention", "fail",
] as const;

const TYPE_STYLES = [
  ["type-display-lg", "8.4"],
  ["type-heading-1", "Maruti Suzuki Swift VXi"],
  ["type-heading-2", "Exterior"],
  ["type-body-lg", "Stand 2 metres back with the whole car in frame."],
  ["type-body", "Minor oil seepage at the valve cover. No active leak."],
  ["type-label", "Registration number"],
  ["type-caption", "9 Nov 2026, 11:42 · Delhi"],
  ["type-reading", "2.1 mm · 118 µm · 48,320 km"],
  ["type-code", "MH12AB1234 · P0420"],
] as const;

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="type-overline uppercase tracking-[0.06em] text-text-subtle">{title}</h2>
      {children}
    </section>
  );
}

function Showcase({ t, dark }: { t: Strings; dark: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Block title="Logo">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
        <img src={dark ? "/brand/treadmark-lockup-horizontal-reverse.svg" : "/brand/treadmark-lockup-horizontal-color.svg"} alt="Treadmark" width={240} height={49} className="h-10 w-auto self-start" />
      </Block>

      <Block title="Colour">
        <ul className="grid grid-cols-2 gap-2">
          {COLOURS.map((name) => (
            <li key={name} className="flex items-center gap-2 type-code text-text-muted">
              <span className="size-6 shrink-0 rounded-sm border border-border" style={{ background: `var(--${name})` }} />
              {name}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Type">
        {TYPE_STYLES.map(([cls, sample]) => (
          <p key={cls} className={`${cls} text-text`}>
            {sample} <span className="type-code text-text-subtle">.{cls}</span>
          </p>
        ))}
        <p lang="hi" className="type-heading-2 text-text">हर गाड़ी की पक्की जाँच</p>
      </Block>

      <Block title="Button">
        <Button>{t.report.publish}</Button>
        <Button variant="secondary">{t.findings.add}</Button>
        <Button variant="ghost">{t.photos.skip}</Button>
        <Button variant="danger">{t.findings.delete}</Button>
        <Button loading>{t.report.publishing}</Button>
        <Button disabled>{t.checklist.finish}</Button>
      </Block>

      <Block title="TextField">
        <Field label={t.cars.regNumber} name={`reg-${dark}`} placeholder={t.cars.regPlaceholder} hint={t.cars.regHint} />
        <Field label={t.cars.make} name={`make-${dark}`} defaultValue="Maruti" error={t.cars.errors.make} />
        <SelectField
          label={t.cars.fuel}
          name={`fuel-${dark}`}
          placeholder={t.cars.choose}
          options={[{ value: "petrol", label: t.cars.fuels.petrol }, { value: "diesel", label: t.cars.fuels.diesel }]}
        />
        <FormError message={t.common.somethingWrong} />
      </Block>

      <Block title="ChecklistItem rating">
        <RatingDemo initial="attention" />
        <RatingDemo initial={null} />
      </Block>

      <Block title="VerdictBadge">
        <div className="flex flex-wrap gap-2">
          {(["ok", "attention", "fail", "na"] as const).map((r) => (
            <VerdictBadge key={r} verdict={resultVerdict[r]}>
              {t.checklist.results[r]}
            </VerdictBadge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["minor", "moderate", "major"] as const).map((s) => (
            <VerdictBadge key={s} verdict={severityVerdict[s]}>
              {t.findings.severities[s]}
            </VerdictBadge>
          ))}
        </div>
        <span className="self-start rounded-sm border border-highlight-badge-border bg-highlight-badge-bg px-2 py-1 type-caption-strong text-highlight-badge-fg">
          {t.home.bestValue}
        </span>
      </Block>

      <Block title="ScoreMeter">
        <div className="flex flex-wrap justify-between gap-4">
          {[9.3, 8.4, 6.5, 4.7, 3.1].map((score) => (
            <ScoreBadge key={score} t={t} view={{ score, scoreText: formatScore(score), band: scoreBand(score) }} />
          ))}
        </div>
      </Block>

      <Block title="RedFlag">
        <RedFlag title={`${t.checklist.items.spare_key.label}: ${t.checklist.results.fail}`} />
        <RedFlag tone="attention" title={`${t.checklist.items.service_history.label}: ${t.checklist.results.attention}`} />
      </Block>

      <Block title="BottomBar">
        <div className="-mb-4 overflow-hidden rounded-md border border-border">
          <div className="px-4">
            <BottomBar progress={12 / 19}>
              <p className="text-center type-body-sm text-text-muted">{t.checklist.finishHint(7)}</p>
              <Button disabled>{t.checklist.finish}</Button>
            </BottomBar>
          </div>
        </div>
      </Block>

      <Block title="Language">
        <LanguageToggle className="self-start" />
      </Block>
    </div>
  );
}

export default async function BrandPage() {
  if (process.env.NODE_ENV === "production" && process.env.SHOW_BRAND_PAGE !== "1") notFound();
  const t = await getT();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="type-heading-1">Treadmark brand</h1>
          <p className="type-body-sm text-text-muted">Rules: .claude/skills/treadmark-brand · brand/reference/components</p>
        </div>
        <LanguageToggle />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div data-theme="light" className="rounded-xl bg-bg p-3">
          <p className="mb-3 type-label text-text-muted">Light</p>
          <Showcase t={t} dark={false} />
        </div>
        <div data-theme="dark" className="rounded-xl bg-bg p-3 text-text">
          <p className="mb-3 type-label text-text-muted">Dark</p>
          <Showcase t={t} dark />
        </div>
      </div>
    </main>
  );
}
