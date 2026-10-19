import type { CarStatus } from "@/lib/supabase/database.types";
import { t } from "@/lib/strings";

const styles: Record<CarStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  inspected: "bg-amber-100 text-amber-800",
  published: "bg-brand-100 text-brand-800",
};

export function StatusBadge({ status }: { status: CarStatus }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {t.dashboard.status[status]}
    </span>
  );
}
