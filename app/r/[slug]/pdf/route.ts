import { NextResponse } from "next/server";
import { ensureReportPdf, signedPdfUrl } from "@/lib/report/pdf-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidSlug } from "@/lib/report/slug";
import { appBaseUrl } from "@/lib/url";

// Building a PDF downloads up to 20 small photos and renders them: usually 2-6 s, only when the
// report has changed since the last download.
export const maxDuration = 60;

/** Download button target: makes sure the stored PDF is current, then redirects to a short-lived link. */
export async function GET(_request: Request, ctx: RouteContext<"/r/[slug]/pdf">) {
  const { slug } = await ctx.params;
  if (!isValidSlug(slug)) return new NextResponse("Not found", { status: 404 });

  const { data: report, error } = await createAdminClient().from("reports").select("car_id").eq("slug", slug).not("published_at", "is", null).maybeSingle();
  if (error) throw error;
  if (!report) return new NextResponse("Not found", { status: 404 });

  const baseUrl = await appBaseUrl();
  let pdf = await ensureReportPdf(report.car_id, baseUrl);
  let url = pdf && (await signedPdfUrl(pdf.path, pdf.filename));
  if (pdf && !url) {
    // The database points at a file that's gone. Build it again.
    pdf = await ensureReportPdf(report.car_id, baseUrl, { force: true });
    url = pdf && (await signedPdfUrl(pdf.path, pdf.filename));
  }
  if (!url) return new NextResponse("Not found", { status: 404 });

  return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "no-store" } });
}
