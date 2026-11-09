// Brand RedFlag (brand/reference/components/RedFlag.md): findings that override the score.
// Red for "do not proceed" and safety, amber for "check before you buy". One line of fact, one of action.
import type { ReactNode } from "react";
import { AlertIcon, CrossCircleIcon } from "@/components/icons";

export function RedFlag({
  tone = "fail",
  title,
  children,
  live = false,
}: {
  tone?: "fail" | "attention";
  title: ReactNode;
  children?: ReactNode;
  /** Set only when the flag appears during the inspection, not on a static report. */
  live?: boolean;
}) {
  const fail = tone === "fail";
  return (
    <div
      role={live ? "alert" : undefined}
      className={`grid grid-cols-[1.5rem_1fr] gap-3 rounded-lg p-4 ${fail ? "bg-flag-fail-bg" : "bg-flag-attention-bg"}`}
    >
      <span className={fail ? "text-flag-fail-icon" : "text-flag-attention-icon"}>
        {fail ? <CrossCircleIcon size={24} /> : <AlertIcon size={24} />}
      </span>
      <div className="min-w-0">
        <p className="type-title-sm text-flag-title">{title}</p>
        {children && <div className="mt-0.5 type-body-sm text-flag-body">{children}</div>}
      </div>
    </div>
  );
}
