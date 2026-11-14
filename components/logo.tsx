import { APP_NAME } from "@/lib/config";

// The Treadmark logo, always from the supplied artwork (brand book, section 2): never retyped, boxed,
// recoloured or stretched. `small` is the plain-ring lockup for app headers and anywhere the symbol is
// under 64px; `mark` is the symbol alone. Use `reverse` on dark grounds.

const FILES = {
  small: { color: "/brand/treadmark-lockup-small-color.svg", reverse: "/brand/treadmark-lockup-small-reverse.svg", ratio: 910.4 / 187 },
  horizontal: { color: "/brand/treadmark-lockup-horizontal-color.svg", reverse: "/brand/treadmark-lockup-horizontal-reverse.svg", ratio: 910.4 / 187 },
  mark: { color: "/brand/treadmark-mark-small-color.svg", reverse: "/brand/treadmark-mark-small-reverse.svg", ratio: 1 },
} as const;

export function Logo({
  variant = "small",
  reverse = false,
  height = 26,
  className = "",
}: {
  variant?: keyof typeof FILES;
  reverse?: boolean;
  /** Pixels. The small lockup must stay at least 72px wide (about 15px tall); the header uses 26px. */
  height?: number;
  className?: string;
}) {
  const file = FILES[variant];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small static SVG; next/image adds nothing here
    <img src={reverse ? file.reverse : file.color} alt={APP_NAME} width={Math.round(height * file.ratio)} height={height} className={`block shrink-0 ${className}`} />
  );
}
