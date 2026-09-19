import Skeleton from './Skeleton'

export default function SkeletonList({
  rows = 5,
  avatar = true,
}: {
  rows?: number
  avatar?: boolean
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4"
        >
          {avatar && <Skeleton className="h-11 w-11 rounded-xl flex-shrink-0" />}
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}