import { Skeleton, SkeletonTable } from '@/components/ui/skeletons'

export default function AdminCarbonConfigLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5 mb-8">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-3">
            <Skeleton className="h-2.5 w-20 mb-2" />
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-6 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-40 rounded-full flex-shrink-0" />
        ))}
      </div>
      <SkeletonTable rows={6} cols={5} />
    </div>
  )
}