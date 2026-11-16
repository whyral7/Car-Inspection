import { APP_NAME } from "@/lib/config";

// The Treadmark logo, always from the supplied artwork (brand book, section 2): never retyped, boxed,
// recoloured or stretched. `small` is the plain-ring lockup for app headers and anywhere the symbol is
// under 64px; `mark` is the symbol alone. The files in /brand/web are light copies of the supplied artwork
// (brand/scripts/optimise-logos.py: same outline, about 3 KB each instead of 22 KB).
// It switches to the reverse colourway on dark grounds by itself.

const FILES = {
  small: { color: "/brand/web/treadmark-lockup-small-color.svg", reverse: "/brand/web/treadmark-lockup-small-reverse.svg", ratio: 910.4 / 187 },
  horizontal: { color: "/brand/web/treadmark-lockup-horizontal-color.svg", reverse: "/brand/web/treadmark-lockup-horizontal-reverse.svg", ratio: 910.4 / 187 },
  mark: { color: "/brand/web/treadmark-mark-small-color.svg", reverse: "/brand/web/treadmark-mark-small-reverse.svg", ratio: 1 },
} as const;

export function Logo({
  variant = "small",
  reverse = false,
  height = 26,
  className = "",
}: {
  variant?: keyof typeof FILES;
  /** Force the reverse colourway. Without it the logo follows the theme: colour on light, reverse on dark. */
  reverse?: boolean;
  /** Pixels. The small lockup must stay at least 72px wide (about 15px tall); the header uses 26px. */
  height?: number;
  className?: string;
}) {
  const file = FILES[variant];
  const size = { width: Math.round(height * file.ratio), height };
  /* eslint-disable @next/next/no-img-element -- small static SVGs; next/image adds nothing here */
  if (reverse) return <img src={file.reverse} alt={APP_NAME} {...size} className={`block shrink-0 ${className}`} />;
  // Both colourways are in the page and the theme shows one (tm-logo-* in app/globals.css). The hidden one
  // is lazy, so it is never downloaded.
  return (
    <>
      <img src={file.color} alt={APP_NAME} {...size} className={`tm-logo-light shrink-0 ${className}`} />
      <img src={file.reverse} alt={APP_NAME} {...size} loading="lazy" className={`tm-logo-dark shrink-0 ${className}`} />
    </>
  );
  /* eslint-enable @next/next/no-img-element */
}
