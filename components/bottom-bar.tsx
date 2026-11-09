// Brand BottomBar (brand/reference/components/BottomBar.md): the sticky bar at the foot of every
// inspection step. Holds the one next action within thumb reach; pads for the phone's safe area.
import type { ReactNode } from "react";

export function BottomBar({ children, progress }: { children: ReactNode; /** 0 to 1; draws the progress track. */ progress?: number }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-bottombar-border bg-bottombar-bg px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-bar">
      {progress !== undefined && (
        <div className="h-1 overflow-hidden rounded-xs bg-progress-track" aria-hidden="true">
          <div className="h-full bg-progress-fill transition-[width] duration-200" style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
        </div>
      )}
      {children}
    </div>
  );
}
