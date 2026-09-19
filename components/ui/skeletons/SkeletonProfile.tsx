import Skeleton from './Skeleton'

export default function SkeletonProfile() {
  return (
    <div className="bg-surface border border-border rounded-[18px] p-6">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full flex-shrink-0" />
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