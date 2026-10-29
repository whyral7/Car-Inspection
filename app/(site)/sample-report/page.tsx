import type { Metadata } from "next";
import { LinkButton } from "@/components/button";
import { ReportView } from "@/components/report/report-view";
import { sampleReportView } from "@/lib/report/sample";
import { en as t } from "@/lib/strings";

export const metadata: Metadata = {
  title: t.sampleReport.metaTitle,
  description: t.home.metaDescription,
  alternates: { canonical: "/sample-report" },
};

export default function SampleReportPage() {
  const view = sampleReportView();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t.sampleReport.banner}</p>
      <ReportView view={view} t={t} />
      <LinkButton href="/login">{t.sampleReport.cta}</LinkButton>
    </div>
  );
}
