import { SkeletonCard, SkeletonChart, Skeleton } from '@/components/ui/skeletons'

export default function CompanyDashboardLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-9 w-full max-w-80" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="bg-surface border border-border rounded-[18px] p-6 sm:p-8 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full max-w-64" />
        <div className="flex flex-wrap gap-2 mt-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-40 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2">
          <SkeletonChart height="h-64" />
        </div>
        <Skeleton className="h-64 w-full rounded-[18px]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2">
          <SkeletonChart height="h-60" />
        </div>
        <SkeletonCard lines={5} />
      </div>
      <SkeletonChart height="h-56" />
    </div>
  )
}