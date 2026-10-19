import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getCurrentDealer } from "@/lib/dealer";
import { loadReport } from "@/lib/report/load";
import { reportUrl } from "@/lib/report/share";
import { buildReportView, parseHiddenSections } from "@/lib/report/view";
import { t } from "@/lib/strings";
import { appBaseUrl } from "@/lib/url";
import { ReportManager } from "./report-manager";

export const metadata: Metadata = { title: t.report.title };

export default async function ReportPage({ params }: PageProps<"/app/cars/[id]/report">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase, dealer } = await getCurrentDealer();
  // Read as the dealer, so RLS limits it to their own car.
  const loaded = await loadReport(supabase, id);
  if (!loaded) notFound();

  const published = loaded.report?.published_at ? { slug: loaded.report.slug, url: reportUrl(await appBaseUrl(), loaded.report.slug) } : null;

  return (
    <ReportManager
      carId={loaded.car.id}
      ready={loaded.car.status !== "draft"}
      unreviewed={loaded.unreviewed}
      credits={dealer.credits}
      // The full report goes to the browser; the preview hides sections as the dealer toggles them.
      view={buildReportView(loaded.input)}
      initialHidden={parseHiddenSections(loaded.report?.hidden_sections)}
      published={published}
    />
  );
}
