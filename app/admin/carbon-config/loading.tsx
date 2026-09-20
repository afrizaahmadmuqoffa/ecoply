import { Skeleton, SkeletonTable } from '@/components/ui/skeletons'

export default function AdminCarbonConfigLoading() {
  const groups = [
    { items: 3 },
    { items: 1 },
    { items: 2 },
    { items: 1 },
  ]

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <Skeleton className="h-9 w-80 max-w-full mb-3" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Mobile: dropdown placeholder */}
        <div className="lg:hidden w-full">
          <Skeleton className="h-3 w-24 mb-1.5" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Sidebar skeleton */}
        <div className="hidden lg:block w-64 shrink-0 sticky top-6">
          <div className="bg-surface border border-border rounded-[18px] p-3">
            <Skeleton className="h-2.5 w-16 mb-3 ml-2" />
            <div className="space-y-1">
              {groups.map((g, gi) => (
                <div key={gi}>
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Skeleton className="h-4 w-9 rounded" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2.5 w-2.5 ml-auto rounded-full" />
                  </div>
                  <div className="ml-2 pl-3 border-l border-border space-y-1 pb-1">
                    {Array.from({ length: g.items }).map((_, ii) => (
                      <Skeleton key={ii} className="h-7 w-11/12 mx-2 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content skeleton: form + table per tab */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
            <div className="lg:col-span-2 lg:sticky lg:top-6">
              <div className="bg-surface border border-border rounded-[18px] p-6">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-56 mb-6" />
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i}>
                      <Skeleton className="h-2.5 w-28 mb-1.5" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                  <div className="bg-canvas rounded-xl p-4 border border-border space-y-3">
                    <Skeleton className="h-2.5 w-24" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                </div>
                <Skeleton className="h-11 w-full rounded-full mt-4" />
              </div>
            </div>
            <div className="lg:col-span-3">
              <SkeletonTable rows={6} cols={6} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}