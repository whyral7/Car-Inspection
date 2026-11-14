import { Badge, type BadgeTone } from "@/components/ui";
import type { Strings } from "@/lib/strings";
import type { CarStatus } from "@/lib/supabase/database.types";

const tones: Record<CarStatus, BadgeTone> = { draft: "neutral", inspected: "warning", published: "brand" };

export function StatusBadge({ status, t }: { status: CarStatus; t: Strings }) {
  return (
    <Badge tone={tones[status]} dot>
      {t.dashboard.status[status]}
    </Badge>
  );
}
