import type { Metadata } from "next";
import { LinkButton } from "@/components/button";
import { ReportView } from "@/components/report/report-view";
import { sampleReportView } from "@/lib/report/sample";
import { getT } from "@/lib/i18n.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.sampleReport.metaTitle, description: t.home.metaDescription, alternates: { canonical: "/sample-report" } };
}

export default async function SampleReportPage() {
  const t = await getT();
  const view = sampleReportView(t);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <p className="rounded-lg border border-accent bg-accent-tint p-4 type-body-sm text-text">{t.sampleReport.banner}</p>
      <ReportView view={view} t={t} />
      <LinkButton href="/login">{t.sampleReport.cta}</LinkButton>
    </div>
  );
}
