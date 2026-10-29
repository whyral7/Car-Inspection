import { STORAGE_BUCKETS } from "@/lib/config";
import { getPublishedReport } from "@/lib/report/load";
import { reportOgImage } from "@/lib/report/og-image";
import { createAdminClient } from "@/lib/supabase/admin";

async function dataUri(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  const { data, error } = await createAdminClient().storage.from(bucket).download(path);
  if (error || !data) return null;
  const type = /\.png$/i.test(path) ? "image/png" : "image/jpeg";
  return `data:${type};base64,${Buffer.from(await data.arrayBuffer()).toString("base64")}`;
}

/**
 * Link preview image for /r/<slug>. The page links it with ?v=<content hash>, so a changed score
 * gets a new URL instead of a stale cached image.
 */
export async function GET(_request: Request, ctx: RouteContext<"/r/[slug]/og.png">) {
  const { slug } = await ctx.params;
  const found = await getPublishedReport(slug, false);
  if (!found) return new Response("Not found", { status: 404 });

  // The report's first photo (normally the front), using the small copy when there is one.
  const lead = found.view.photos?.[0] ? found.loaded.images.find((img) => img.angleKey === found.view.photos![0].key) : undefined;
  const [logo, photo] = await Promise.all([dataUri(STORAGE_BUCKETS.logos, found.loaded.logoPath), dataUri(STORAGE_BUCKETS.inspectionPhotos, lead?.path)]);
  return reportOgImage(found.view, logo, photo, { "Cache-Control": "public, max-age=86400, s-maxage=604800" });
}
