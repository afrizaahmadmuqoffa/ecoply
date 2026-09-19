import { Skeleton, SkeletonTable } from '@/components/ui/skeletons'

export default function CompanyCarbonLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-3 min-w-0">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="h-10 w-44 rounded-full" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="mb-5">
          <SkeletonTable rows={2} cols={4} />
        </div>
      ))}
    </div>
  )
}