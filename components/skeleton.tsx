// Grey placeholder blocks shown by loading.tsx while a page waits for the server, so a tap on slow
// 4G gives instant feedback instead of a frozen screen.

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

/** Back link, title and a few cards: the shape of most app screens. */
export function PageSkeleton({ cards = 3, grid = false, label }: { cards?: number; grid?: boolean; label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-4">
      <Block className="h-5 w-28" />
      <Block className="h-8 w-2/3" />
      <Block className="h-4 w-1/2" />
      {grid ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }, (_, i) => (
            <Block key={i} className="aspect-square" />
          ))}
        </div>
      ) : (
        Array.from({ length: cards }, (_, i) => <Block key={i} className="h-28 rounded-2xl" />)
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}
