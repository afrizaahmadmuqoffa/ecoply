import { Skeleton, SkeletonChart, SkeletonCard } from '@/components/ui/skeletons'

export default function RecyclerDashboardLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-9 w-full max-w-80" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="bg-surface border border-border rounded-[18px] p-6 sm:p-8 mb-8">
        <Skeleton className="h-3 w-36 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="min-w-0">
              <Skeleton className="h-3 w-full max-w-28 mb-2" />
              <Skeleton className="h-9 w-full max-w-36" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Skeleton className="h-64 w-full rounded-[18px]" />
        <div className="lg:col-span-2">
          <SkeletonChart height="h-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2">
          <SkeletonChart height="h-60" />
        </div>
        <SkeletonCard lines={5} />
      </div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0 space-y-3">
          <Skeleton className="h-5 w-full max-w-64" />
          <Skeleton className="h-4 w-full max-w-96" />
        </div>
        <Skeleton className="h-11 w-full max-w-44 rounded-full sm:w-44" />
      </div>
    </div>
  )
}