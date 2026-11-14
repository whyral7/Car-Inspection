import type { ReactNode } from "react";
import { AlertIcon, CheckIcon, CrossCircleIcon } from "@/components/icons";

// Brand badges (brand/reference/components/VerdictBadge.md).
// - success / warning / danger are the three ratings: always the rating colour, a word and its glyph.
//   Never olive or sandstone for a rating.
// - neutral is the "not applicable / no rating" badge; brand marks a selected or active state.
// - highlight is the one Sandstone call-out a screen may have (ink text; `onPage` adds the 1px edge it
//   needs on the paper page).
export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "highlight";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-verdict-na-bg text-verdict-na-fg",
  brand: "bg-accent-tint text-text",
  success: "bg-verdict-pass-bg text-verdict-pass-fg",
  warning: "bg-verdict-attention-bg text-verdict-attention-fg",
  danger: "bg-verdict-fail-bg text-verdict-fail-fg",
  highlight: "bg-highlight-badge-bg text-highlight-badge-fg",
};

const glyphs: Partial<Record<BadgeTone, ReactNode>> = {
  success: <CheckIcon size={14} />,
  warning: <AlertIcon size={14} />,
  danger: <CrossCircleIcon size={14} />,
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className = "",
  label,
  onPage,
}: {
  tone?: BadgeTone;
  /** Replaces the rating glyph, or adds an icon to a neutral or brand badge. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  label?: string;
  /** Highlight only: the badge sits on the paper page, not on a card, so it gets a 1px edge. */
  onPage?: boolean;
  /** @deprecated Ratings always carry their glyph now. */
  dot?: boolean;
}) {
  const highlight = tone === "highlight";
  return (
    <span
      aria-label={label}
      className={`inline-flex shrink-0 items-center gap-[var(--verdict-gap)] rounded-sm whitespace-nowrap ${
        highlight
          ? `h-[var(--highlight-badge-height)] px-[var(--highlight-badge-padding-x)] [font:var(--highlight-badge-font)] ${onPage ? "border border-highlight-badge-border" : ""}`
          : "h-[var(--verdict-height)] pr-2.5 pl-2 [font:var(--verdict-font)]"
      } ${tones[tone]} ${className}`}
    >
      {icon ?? glyphs[tone]}
      {children}
    </span>
  );
}
