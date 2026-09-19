import Skeleton from './Skeleton'

export default function SkeletonProfile() {
  return (
    <div className="bg-surface border border-border rounded-[18px] p-6">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
        <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-full max-w-[180px]" />
          <Skeleton className="h-3.5 w-2/3 max-w-[110px]" />
        </div>
        <Skeleton className="h-9 w-24 sm:w-28 rounded-full flex-shrink-0" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}