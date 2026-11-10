import type { Metadata } from "next";
import { LinkButton } from "@/components/ui";
import { ReportView } from "@/components/report/report-view";
import { sampleReportView } from "@/lib/report/sample";
import { getT } from "@/lib/i18n.server";
import { en } from "@/lib/strings";

export const metadata: Metadata = {
  title: en.sampleReport.metaTitle,
  description: en.home.metaDescription,
  alternates: { canonical: "/sample-report" },
};

export default async function SampleReportPage() {
  const t = await getT();
  const view = sampleReportView(t);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <p className="rounded-card bg-warning-50 p-4 text-small text-warning-800">{t.sampleReport.banner}</p>
      <ReportView view={view} t={t} />
      <LinkButton href="/login">{t.sampleReport.cta}</LinkButton>
    </div>
  );
}
