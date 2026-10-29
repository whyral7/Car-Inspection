import type { CarStatus } from "@/lib/supabase/database.types";
import type { Strings } from "@/lib/strings";

const styles: Record<CarStatus, string> = {
  draft: "bg-slate-100 text-slate-800",
  inspected: "bg-amber-100 text-amber-900",
  published: "bg-brand-100 text-brand-900",
};

export function StatusBadge({ status, t }: { status: CarStatus; t: Strings }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {t.dashboard.status[status]}
    </span>
  );
}
