import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PHOTO, STORAGE_BUCKETS } from "@/lib/config";
import { getCurrentDealer } from "@/lib/dealer";
import { carTitle } from "@/lib/format";
import { ANGLES, isAngleKey } from "@/lib/photos/angles";
import { t } from "@/lib/strings";
import { FindingsReview, type ReviewPhoto } from "./findings-review";

export const metadata: Metadata = { title: t.findings.title };

export default async function FindingsPage({ params }: PageProps<"/app/cars/[id]/findings">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase } = await getCurrentDealer();
  // RLS limits every query to the dealer's own cars.
  const { data: car, error: carError } = await supabase.from("cars").select("id, reg_number, make, model, variant, year, odometer_km").eq("id", id).maybeSingle();
  if (carError) throw carError;
  if (!car) notFound();

  const [photosRes, findingsRes] = await Promise.all([
    supabase.from("inspection_photos").select("id, angle_key, storage_path, ai_status, ai_findings").eq("car_id", id),
    supabase.from("findings").select("*").eq("car_id", id).order("created_at"),
  ]);
  if (photosRes.error) throw photosRes.error;
  if (findingsRes.error) throw findingsRes.error;

  const order = new Map(ANGLES.map((a, i) => [a.key as string, i]));
  const rows = photosRes.data.filter((p) => isAngleKey(p.angle_key)).sort((a, b) => order.get(a.angle_key)! - order.get(b.angle_key)!);

  const urlByPath = new Map<string, string>();
  if (rows.length > 0) {
    const { data: signed, error: signError } = await supabase.storage.from(STORAGE_BUCKETS.inspectionPhotos).createSignedUrls(
      rows.map((p) => p.storage_path),
      PHOTO.signedUrlSeconds,
    );
    if (signError) throw signError;
    for (const s of signed) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  // Only the odometer reading leaves the server; the raw model output stays in the database.
  const photos: ReviewPhoto[] = rows.map((p) => {
    const raw = p.ai_findings;
    const km = raw && typeof raw === "object" && !Array.isArray(raw) && typeof raw.odometer_km === "number" ? raw.odometer_km : null;
    return { id: p.id, angleKey: p.angle_key as ReviewPhoto["angleKey"], url: urlByPath.get(p.storage_path) ?? null, aiStatus: p.ai_status, odometerKm: km };
  });

  return (
    <FindingsReview
      carId={car.id}
      regNumber={car.reg_number}
      carTitle={carTitle(car)}
      odometerKm={car.odometer_km}
      initialPhotos={photos}
      initialFindings={findingsRes.data}
    />
  );
}
