import { PageSkeleton } from "@/components/skeleton";
import { getT } from "@/lib/i18n.server";

export default async function Loading() {
  const t = await getT();
  return <PageSkeleton grid label={t.common.loading} />;
}
