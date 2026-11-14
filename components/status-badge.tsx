import { Badge, type BadgeTone } from "@/components/ui";
import type { Strings } from "@/lib/strings";
import type { CarStatus } from "@/lib/supabase/database.types";

// A car's stage is not a rating, so it never takes a rating colour: neutral until it is published.
const tones: Record<CarStatus, BadgeTone> = { draft: "neutral", inspected: "neutral", published: "brand" };

export function StatusBadge({ status, t }: { status: CarStatus; t: Strings }) {
  return <Badge tone={tones[status]}>{t.dashboard.status[status]}</Badge>;
}
