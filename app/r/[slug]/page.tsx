import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactButtons, ReportView } from "@/components/report/report-view";
import { APP_NAME } from "@/lib/config";
import { contentVersion, getPublishedReport } from "@/lib/report/load";
import { reportPdfPath, reportUrl, telHref } from "@/lib/report/share";
import { buildReportView, parseHiddenSections, summaryParts } from "@/lib/report/view";
import { en } from "@/lib/strings";
import { getT } from "@/lib/i18n.server";
import { appBaseUrl } from "@/lib/url";

// Public report for buyers. No login: it is read with the service role by slug, and only published
// reports are found. Hidden sections are removed on the server, so they never reach the browser.

// Link previews (WhatsApp, search) stay in English: crawlers send no language preference.
export async function generateMetadata({ params }: PageProps<"/r/[slug]">): Promise<Metadata> {
  const t = en;
  const { slug } = await params;
  const found = await getPublishedReport(slug);
  if (!found) return { title: t.publicReport.notFoundTitle, robots: { index: false, follow: false } };

  const { view, loaded } = found;
  const url = reportUrl(await appBaseUrl(), slug);
  const car = view.car.title || view.car.regNumber;
  const title = t.publicReport.ogTitle(car, view.scoreText);
  const dealer = [view.dealer.name, view.dealer.city].filter(Boolean).join(", ");
  const description = t.publicReport.ogDescription(view.car.regNumber, dealer, summaryParts(view));
  // Changes whenever anything drawn on the image changes, so WhatsApp and CDNs fetch a fresh one.
  const v = contentVersion({ car, reg: view.car.regNumber, score: view.scoreText, dealer, logo: loaded.logoPath, parts: summaryParts(view) });
  const image = { url: `${url}/og.png?v=${v}`, width: 1200, height: 630, alt: t.publicReport.ogAlt(car, view.scoreText), type: "image/png" };

  return {
    title: { absolute: title },
    description,
    // Reports are shared by link, not meant to turn up in search results.
    robots: { index: false, follow: false },
    alternates: { canonical: url },
    openGraph: { type: "website", url, siteName: APP_NAME, locale: "en_IN", title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PublicReportPage({ params }: PageProps<"/r/[slug]">) {
  const t = await getT();
  const { slug } = await params;
  const found = await getPublishedReport(slug);
  if (!found) notFound();
  const view = t === en ? found.view : buildReportView(found.loaded.input, parseHiddenSections(found.loaded.report?.hidden_sections), undefined, t);
  const canContact = Boolean(telHref(view.dealer.phone));

  return (
    <>
      <main className={`mx-auto w-full max-w-2xl flex-1 px-4 pt-[calc(1rem+env(safe-area-inset-top))] ${canContact ? "pb-28" : "pb-6"}`}>
        <ReportView view={view} t={t} pdfHref={reportPdfPath(slug)} />
      </main>
      {canContact && (
        // Always in reach while the buyer scrolls through the photos.
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white">
          <div className="mx-auto w-full max-w-2xl px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <ContactButtons view={view} t={t} />
          </div>
        </div>
      )}
    </>
  );
}
