import { AlertIcon, InfoIcon, XIcon } from "@/components/icons";
import { Badge, type BadgeTone } from "@/components/ui";
import type { Severity } from "@/lib/supabase/database.types";

/** How loud each damage severity is, everywhere it appears (review screen, report; the PDF uses lib/report/colors). */
export const SEVERITY_TONE: Record<Severity, BadgeTone> = { minor: "neutral", moderate: "warning", major: "danger" };

// A different shape per level, so severity never rests on colour alone.
const ICON: Record<Severity, typeof InfoIcon> = { minor: InfoIcon, moderate: AlertIcon, major: XIcon };

export function SeverityBadge({ severity, label, className = "" }: { severity: Severity; label: string; className?: string }) {
  const Icon = ICON[severity];
  return (
    <Badge tone={SEVERITY_TONE[severity]} icon={<Icon size={12} strokeWidth={2.5} />} className={className}>
      {label}
    </Badge>
  );
}
