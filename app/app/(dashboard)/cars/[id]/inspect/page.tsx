import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PHOTO, STORAGE_BUCKETS } from "@/lib/config";
import { carTitle } from "@/lib/format";
import { ANGLES, isAngleKey, smallPhotoPath } from "@/lib/photos/angles";
import { getCurrentProfile } from "@/lib/profile";
import { getT } from "@/lib/i18n.server";
import { PhotoCapture, type InitialPhoto } from "./photo-capture";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.photos.title };
}

export default async function InspectPage({ params, searchParams }: PageProps<"/app/cars/[id]/inspect">) {
  const { id } = await params;
  // ?angle=odometer opens straight on that photo, e.g. from "Retake photo" on the damage notes screen.
  const { angle } = await searchParams;
  const startAt = typeof angle === "string" && isAngleKey(angle) ? ANGLES.findIndex((a) => a.key === angle) : null;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase } = await getCurrentProfile();
  // RLS limits both queries to the dealer's own cars.
  const { data: car, error: carError } = await supabase.from("cars").select("id, reg_number, make, model, variant, year").eq("id", id).maybeSingle();
  if (carError) throw carError;
  if (!car) notFound();

  const { data: rows, error: photosError } = await supabase.from("inspection_photos").select("angle_key, storage_path").eq("car_id", id);
  if (photosError) throw photosError;
  const photos = rows.flatMap((r) => (isAngleKey(r.angle_key) ? [{ angleKey: r.angle_key, path: r.storage_path }] : []));

  // The bucket is private, so photos go through short-lived signed URLs. Tiles use the small copy
  // (about 60 KB instead of 300+ KB); the guide screen shows the full photo.
  const urlByPath = new Map<string, string>();
  if (photos.length > 0) {
    const paths = photos.flatMap((p) => [p.path, smallPhotoPath(id, p.angleKey)]);
    const { data: signed, error: signError } = await supabase.storage.from(STORAGE_BUCKETS.inspectionPhotos).createSignedUrls(paths, PHOTO.signedUrlSeconds);
    if (signError) throw signError;
    for (const s of signed) if (s.path && s.signedUrl && !s.error) urlByPath.set(s.path, s.signedUrl);
  }
  const initialPhotos: InitialPhoto[] = photos.map((p) => ({
    angleKey: p.angleKey,
    url: urlByPath.get(p.path) ?? null,
    thumbUrl: urlByPath.get(smallPhotoPath(id, p.angleKey)) ?? null,
  }));

  return <PhotoCapture carId={car.id} regNumber={car.reg_number} carTitle={carTitle(car)} initialPhotos={initialPhotos} startAt={startAt} />;
}
