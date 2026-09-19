import Skeleton from './Skeleton'

const WIDTHS = ['w-full', 'w-4/5', 'w-2/3', 'w-5/6', 'w-3/4', 'w-1/2']

export default function SkeletonCard({
  lines = 4,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`bg-surface border border-border rounded-[18px] p-6 ${className}`}>
      <Skeleton className="h-5 w-1/3 mb-6" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${WIDTHS[i % WIDTHS.length]}`} />
        ))}
      </div>
    </div>
  )
}