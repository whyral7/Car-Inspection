// Placeholder blocks shown by loading.tsx while a page waits for the server, so a tap on slow 4G
// gives instant feedback instead of a frozen screen.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-control bg-sunken ${className}`} />;
}

/** Back link, title and a few cards: the shape of most app screens. */
export function PageSkeleton({ cards = 3, grid = false, label }: { cards?: number; grid?: boolean; label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-4">
      <Skeleton className="h-5 w-24" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      {grid ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-card" />
          ))}
        </div>
      ) : (
        Array.from({ length: cards }, (_, i) => <Skeleton key={i} className="h-28 rounded-card" />)
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}
