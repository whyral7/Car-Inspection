import { CreditIcon } from "@/components/icons";
import { Badge } from "@/components/ui";
import type { Strings } from "@/lib/strings";

export function CreditsBadge({ credits, t }: { credits: number; t: Strings }) {
  return (
    <Badge tone={credits <= 1 ? "warning" : "brand"} icon={<CreditIcon size={14} />} label={t.dashboard.creditsLeft(credits)} className="tabular">
      {t.dashboard.creditsShort(credits)}
    </Badge>
  );
}
