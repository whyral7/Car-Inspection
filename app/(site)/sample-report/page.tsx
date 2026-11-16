import type { Metadata } from "next";
import { LinkButton } from "@/components/ui";
import { ReportView } from "@/components/report/report-view";
import { FREE_CREDITS } from "@/lib/config";
import { ANGLES } from "@/lib/photos/angles";
import { sampleReportView } from "@/lib/report/sample";
import { getT } from "@/lib/i18n.server";
import { en } from "@/lib/strings";

export const metadata: Metadata = {
  title: en.sampleReport.metaTitle,
  description: en.home.metaDescription(ANGLES.length, FREE_CREDITS),
  alternates: { canonical: "/sample-report" },
};

export default async function SampleReportPage() {
  const t = await getT();
  const view = sampleReportView(t);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 lg:max-w-5xl">
      <p className="rounded-lg bg-accent-tint p-4 type-body-sm text-text">{t.sampleReport.banner(ANGLES.length)}</p>
      <ReportView view={view} t={t} wide />
      <LinkButton href="/login">{t.sampleReport.cta}</LinkButton>
    </div>
  );
}
