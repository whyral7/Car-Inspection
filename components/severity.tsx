import { VerdictBadge, severityVerdict } from "@/components/verdict-badge";
import type { Severity } from "@/lib/supabase/database.types";

/** Damage severity as a rating badge: minor and moderate are "attention", major is "fail"; the word says which. */
export function SeverityBadge({ severity, label, className = "" }: { severity: Severity; label: string; className?: string }) {
  return (
    <VerdictBadge verdict={severityVerdict[severity]} className={className}>
      {label}
    </VerdictBadge>
  );
}
