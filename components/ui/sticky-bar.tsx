"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Bottom action bar on task screens: the main action stays in thumb reach while the page scrolls.
 * It publishes its height as --sticky-bar-height so toasts and scroll padding sit above it.
 * It sits at the bottom of the screen even when the page is short (`mt-auto` in the page's flex column)
 * and runs to the screen edge (the negative margin undoes main's bottom padding).
 * Solid background, no blur (blur is slow on low-end phones).
 */
export function StickyBar({ children, className = "" }: { children: ReactNode; className?: string }) {
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

  return (
    <div
      ref={ref}
      className={`sticky bottom-0 z-10 -mx-4 mt-auto -mb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col gap-2 bg-surface px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-bar sm:bottom-6 sm:mx-0 sm:mt-6 sm:mb-0 sm:rounded-card sm:p-4 sm:shadow-raised ${className}`}
    >
      {children}
    </div>
  );
}
