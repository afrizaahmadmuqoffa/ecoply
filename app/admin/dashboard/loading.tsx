import { Skeleton, SkeletonChart, SkeletonList } from '@/components/ui/skeletons'

export default function AdminDashboardLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-9 w-full max-w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="min-w-0 bg-surface border border-border rounded-[18px] p-5">
            <Skeleton className="h-3.5 w-full max-w-28 mb-3" />
            <Skeleton className="h-9 w-full max-w-36" />
            <Skeleton className="h-3 w-full max-w-24 mt-3" />
          </div>
        ))}
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
        <Skeleton className="h-60 w-full rounded-[18px]" />
      </div>
      <div className="bg-surface border border-border rounded-[18px] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-52" />
          </div>
        </div>
        <SkeletonList rows={4} avatar={false} />
      </div>
    </div>
  )
}