import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/profile";
import { loadReport } from "@/lib/report/load";
import { reportUrl } from "@/lib/report/share";
import { buildReportView, parseHiddenSections } from "@/lib/report/view";
import { getT } from "@/lib/i18n.server";
import { appBaseUrl } from "@/lib/url";
import { ReportManager } from "./report-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.report.title };
}

// The price estimate (a server action on this page) researches listings for up to a minute or two.
export const maxDuration = 180;

export default async function ReportPage({ params }: PageProps<"/app/cars/[id]/report">) {
  const t = await getT();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase, profile } = await getCurrentProfile();
  // Read as the dealer, so RLS limits it to their own car.
  const loaded = await loadReport(supabase, id);
  if (!loaded) notFound();

  const published = loaded.report?.published_at ? { slug: loaded.report.slug, url: reportUrl(await appBaseUrl(), loaded.report.slug) } : null;

  return (
    <ReportManager
      carId={loaded.car.id}
      ready={loaded.car.status !== "draft"}
      unreviewed={loaded.unreviewed}
      credits={profile.credits}
      // The full report goes to the browser; the preview hides sections as the dealer toggles them.
      view={buildReportView(loaded.input, [], undefined, t)}
      initialHidden={parseHiddenSections(loaded.report?.hidden_sections)}
      published={published}
    />
  );
}
