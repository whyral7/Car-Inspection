import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { runWithConcurrency } from "@/lib/concurrency";
import { REPORT, STORAGE_BUCKETS } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { contentVersion, loadReport } from "./load";
import { ReportPdf, type PdfImage } from "./pdf";
import { reportUrl } from "./share";
import { buildReportView, parseHiddenSections } from "./view";

async function download(bucket: string, path: string): Promise<PdfImage | null> {
  const { data, error } = await createAdminClient().storage.from(bucket).download(path);
  if (error || !data) return null;
  const format = /\.png$/i.test(path) ? "png" : "jpg";
  return { data: Buffer.from(await data.arrayBuffer()), format };
}

/**
 * Makes sure the published report for `carId` has a PDF that matches what it shows right now, and
 * returns where it is in the private `reports` bucket. PDFs are stored at <car_id>/<content hash>.pdf,
 * so an unchanged report is never rebuilt and any edit (a note, a hidden section, a retaken photo)
 * gets a fresh one on the next download. Returns null if the car has no published report.
 */
export async function ensureReportPdf(carId: string, baseUrl: string, { force = false } = {}) {
  const admin = createAdminClient();
  const loaded = await loadReport(admin, carId, { signUrls: false });
  if (!loaded?.report?.published_at) return null;

  const view = buildReportView(loaded.input, parseHiddenSections(loaded.report.hidden_sections));
  const url = reportUrl(baseUrl, loaded.report.slug);
  const version = contentVersion({
    pdf: REPORT.pdfVersion,
    url,
    view: { ...view, photos: view.photos?.map((p) => p.key) ?? null, dealer: { ...view.dealer, logoUrl: null } },
    images: loaded.images,
    logo: loaded.logoPath,
  });
  const path = `${carId}/${version}.pdf`;
  const filename = `${view.car.regNumber}-inspection-report.pdf`;
  if (!force && loaded.report.pdf_path === path) return { path, filename };

  const shown = new Set<string>(view.photos?.map((p) => p.key) ?? []);
  const wanted = loaded.images.filter((img) => shown.has(img.angleKey));
  const [logo, results] = await Promise.all([
    loaded.logoPath ? download(STORAGE_BUCKETS.logos, loaded.logoPath) : null,
    runWithConcurrency(wanted, 5, (img) => download(STORAGE_BUCKETS.inspectionPhotos, img.path)),
  ]);
  const images = new Map<string, PdfImage>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) images.set(wanted[i].angleKey, r.value);
  });

  const pdf = await renderToBuffer(<ReportPdf view={view} reportUrl={url} logo={logo} images={images} />);

  const bucket = admin.storage.from(STORAGE_BUCKETS.reports);
  const { error: uploadError } = await bucket.upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;
  const { error: updateError } = await admin.from("reports").update({ pdf_path: path, score: view.score }).eq("car_id", carId);
  if (updateError) throw updateError;
  if (loaded.report.pdf_path && loaded.report.pdf_path !== path) await bucket.remove([loaded.report.pdf_path]);

  return { path, filename };
}

/** A short-lived download link for a stored PDF, saved under `filename`. */
export async function signedPdfUrl(path: string, filename: string) {
  const { data, error } = await createAdminClient().storage.from(STORAGE_BUCKETS.reports).createSignedUrl(path, REPORT.pdfUrlSeconds, { download: filename });
  if (error) return null;
  return data.signedUrl;
}
