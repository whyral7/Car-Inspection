"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Brand BottomBar (brand/reference/components/BottomBar.md): the sticky bar at the foot of a task
 * screen, holding the one next action within thumb reach. Optionally shows where you are (step count
 * and title) and a progress track. Buttons inside it are the 52px size.
 *
 * It publishes its height as --sticky-bar-height so toasts and scroll padding sit above it, sits at the
 * bottom of the screen even when the page is short (`mt-auto` in the page's flex column), runs to the
 * screen edge (the negative margin undoes main's bottom padding) and pads for the phone's safe area.
 * On wide screens it follows the content, anchored to the bottom edge.
 */
export function StickyBar({
  children,
  className = "",
  step,
  title,
  progress,
}: {
  children: ReactNode;
  className?: string;
  /** "Step 2 of 4", shown as an overline. */
  step?: string;
  /** What this step is, one line. */
  title?: string;
  /** 0 to 1; draws the progress track. */
  progress?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const set = () => root.style.setProperty("--sticky-bar-height", `${el.offsetHeight}px`);
    set();
    const observer = new ResizeObserver(set);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--sticky-bar-height");
    };
  }, []);

  const hasMeta = Boolean(step || title || progress !== undefined);
  return (
    <div
      ref={ref}
      className={`sticky bottom-0 z-10 -mx-4 mt-auto -mb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col gap-2 border-t border-bottombar-border bg-bottombar-bg px-[var(--bottombar-padding-x)] pt-[var(--bottombar-padding-y)] pb-[calc(var(--bottombar-padding-y)+env(safe-area-inset-bottom))] shadow-bar sm:mx-0 sm:mt-6 sm:rounded-t-lg sm:border-x [&_.tm-btn]:min-h-[var(--button-height-lg)] [&_.tm-btn]:[font:var(--button-font-lg)] ${className}`}
    >
      {hasMeta && (
        <div className="min-w-0">
          {step && <p className="caps type-overline text-bottombar-step">{step}</p>}
          {title && <p className="truncate type-title-sm">{title}</p>}
          {progress !== undefined && (
            <div aria-hidden="true" className="mt-1.5 h-[var(--progress-height)] overflow-hidden rounded-2xs bg-progress-track">
              <div className="h-full bg-progress-fill transition-[width] duration-[var(--dur-base)]" style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
