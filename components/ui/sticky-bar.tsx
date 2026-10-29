"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Bottom action bar on task screens: the main action stays in thumb reach while the page scrolls.
 * It publishes its height as --sticky-bar-height so toasts and scroll padding sit above it.
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
      className={`sticky bottom-0 z-10 -mx-4 mt-4 flex flex-col gap-2 bg-surface px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-bar sm:bottom-4 sm:mx-0 sm:rounded-card sm:px-6 sm:pb-4 sm:shadow-raised ${className}`}
    >
      {children}
    </div>
  );
}
