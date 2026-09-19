import Skeleton from './Skeleton'

export default function SkeletonTable({
  rows = 5,
  cols = 4,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="bg-surface border border-border rounded-[18px] p-6">
      <div className="flex items-center justify-between mb-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="space-y-3">
        <div
          className="grid gap-4 pb-2 border-b border-border"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3.5" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-4 items-center"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-5 ${c === 0 ? 'w-3/4' : 'w-full'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}