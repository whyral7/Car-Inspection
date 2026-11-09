import type { CarStatus } from "@/lib/supabase/database.types";
import { getT } from "@/lib/i18n.server";

const styles: Record<CarStatus, string> = {
  draft: "bg-surface-sunken text-text-muted",
  inspected: "bg-surface-sunken text-text",
  published: "bg-accent-tint text-accent",
};

export async function StatusBadge({ status }: { status: CarStatus }) {
  const t = await getT();
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-sm px-2 py-1 type-caption-strong ${styles[status]}`}>
      {t.dashboard.status[status]}
    </span>
  );
}
