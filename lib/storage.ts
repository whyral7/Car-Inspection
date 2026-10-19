import { STORAGE_BUCKETS } from "@/lib/config";
import { publicEnv } from "@/lib/env";

/** Public URL for a logo in the public `logos` bucket. */
export function logoUrl(path: string | null | undefined) {
  if (!path) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKETS.logos}/${encoded}`;
}
