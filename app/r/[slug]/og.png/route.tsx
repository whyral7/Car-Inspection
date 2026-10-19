import { STORAGE_BUCKETS } from "@/lib/config";
import { getPublishedReport } from "@/lib/report/load";
import { reportOgImage } from "@/lib/report/og-image";
import { createAdminClient } from "@/lib/supabase/admin";

async function logoDataUri(path: string | null) {
  if (!path) return null;
  const { data, error } = await createAdminClient().storage.from(STORAGE_BUCKETS.logos).download(path);
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

  return reportOgImage(found.view, await logoDataUri(found.loaded.logoPath), { "Cache-Control": "public, max-age=86400, s-maxage=604800" });
}
