import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { REPORT, STORAGE_BUCKETS } from "@/lib/config";
import { isAngleKey, smallPhotoPath } from "@/lib/photos/angles";
import { logoUrl } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CarRow, Database, ReportRow } from "@/lib/supabase/database.types";
import { buildReportView, parseHiddenSections, type ReportInput, type ReportView } from "./view";
import { isValidSlug } from "./slug";

type Client = SupabaseClient<Database>;

export type LoadedReport = {
  car: CarRow;
  /** null until the first publish. */
  report: ReportRow | null;
  input: ReportInput;
  /** The stored image behind each photo (the small copy when it's current), for the PDF. */
  images: { angleKey: string; path: string; version: string }[];
  logoPath: string | null;
  /** AI notes the dealer hasn't accepted yet. They never show on the report. */
  unreviewed: number;
};

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);

/**
 * Everything a report needs for one car. With the dealer's client RLS limits it to their own cars;
 * with the service-role client (public pages) the caller must already have checked the report is published.
 * `signUrls: false` skips photo links (PDF and preview image), and each photo's `url` is its storage path.
 */
export async function loadReport(client: Client, carId: string, { signUrls = true } = {}): Promise<LoadedReport | null> {
  const { data: car, error: carError } = await client.from("cars").select("*").eq("id", carId).maybeSingle();
  if (carError) throw carError;
  if (!car) return null;

  const bucket = client.storage.from(STORAGE_BUCKETS.inspectionPhotos);
  const [dealerRes, photosRes, findingsRes, checklistRes, reportRes, mainList, smallList] = await Promise.all([
    client.from("dealers").select("business_name, owner_name, phone, city, address, logo_path").eq("id", car.dealer_id).single(),
    client.from("inspection_photos").select("id, angle_key, storage_path, updated_at").eq("car_id", carId),
    client.from("findings").select("type, location, severity, note, accepted, photo_id").eq("car_id", carId).order("created_at"),
    client.from("checklist_items").select("item_key, result, note").eq("car_id", carId),
    client.from("reports").select("*").eq("car_id", carId).maybeSingle(),
    bucket.list(`cars/${carId}`, { limit: 100 }),
    bucket.list(`cars/${carId}/small`, { limit: 100 }),
  ]);
  for (const res of [dealerRes, photosRes, findingsRes, checklistRes, reportRes]) if (res.error) throw res.error;
  const dealer = dealerRes.data!;

  // A small copy is used only when it was uploaded after the current full photo. A retake whose
  // small copy failed to upload would otherwise show the old picture.
  const mainByPath = new Map((mainList.data ?? []).map((o) => [`cars/${carId}/${o.name}`, o]));
  const smallByName = new Map((smallList.data ?? []).map((o) => [o.name, o]));
  const photos = photosRes.data!.flatMap((p) => {
    if (!isAngleKey(p.angle_key)) return [];
    const main = mainByPath.get(p.storage_path);
    const mainTime = main?.updated_at ?? main?.created_at ?? p.updated_at;
    const small = smallByName.get(`${p.angle_key}.jpg`);
    const smallTime = small?.updated_at ?? small?.created_at;
    const smallPath = small && time(smallTime) >= time(mainTime) ? smallPhotoPath(carId, p.angle_key) : null;
    return [{ id: p.id, angleKey: p.angle_key, path: p.storage_path, smallPath, version: `${mainTime}|${smallPath ? smallTime : ""}` }];
  });

  const signed = new Map<string, string>();
  if (signUrls && photos.length > 0) {
    const paths = photos.flatMap((p) => (p.smallPath ? [p.path, p.smallPath] : [p.path]));
    const { data, error } = await bucket.createSignedUrls(paths, REPORT.photoUrlSeconds);
    if (error) throw error;
    for (const s of data) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  const input: ReportInput = {
    slug: reportRes.data?.slug ?? null,
    publishedAt: reportRes.data?.published_at ?? null,
    dealer: { ...dealer, logoUrl: logoUrl(dealer.logo_path) },
    car: { ...car, fromRc: car.rc_raw !== null },
    photos: photos.flatMap((p) => {
      if (!signUrls) return [{ id: p.id, angle_key: p.angleKey, url: p.path, thumbUrl: p.smallPath }];
      const url = signed.get(p.path);
      return url ? [{ id: p.id, angle_key: p.angleKey, url, thumbUrl: (p.smallPath && signed.get(p.smallPath)) || null }] : [];
    }),
    findings: findingsRes.data!,
    checklist: checklistRes.data!,
  };

  return {
    car,
    report: reportRes.data,
    input,
    images: photos.map((p) => ({ angleKey: p.angleKey, path: p.smallPath ?? p.path, version: p.version })),
    logoPath: dealer.logo_path,
    unreviewed: findingsRes.data!.filter((f) => !f.accepted).length,
  };
}

/**
 * A published report by its public slug, read with the service role, with hidden sections already
 * removed. null for an unknown or unpublished slug. Cached per request so the page and its metadata
 * share one lookup.
 */
export const getPublishedReport = cache(async (slug: string, signUrls: boolean = true): Promise<{ loaded: LoadedReport; view: ReportView } | null> => {
  if (!isValidSlug(slug)) return null;
  const admin = createAdminClient();
  const { data: report, error } = await admin.from("reports").select("car_id").eq("slug", slug).not("published_at", "is", null).maybeSingle();
  if (error) throw error;
  if (!report) return null;

  const loaded = await loadReport(admin, report.car_id, { signUrls });
  if (!loaded?.report) return null;
  return { loaded, view: buildReportView(loaded.input, parseHiddenSections(loaded.report.hidden_sections)) };
});

/** Short hash of what a report shows, for cache-busting the PDF and the link preview image. */
export function contentVersion(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}
