import Skeleton from './Skeleton'

export default function ReviewPageSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="space-y-2 min-w-0">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-surface border border-border rounded-[18px] p-5">
            <Skeleton className="h-3 w-32 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-[18px] p-5">
            <Skeleton className="h-3 w-36 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
          <Skeleton className="h-52 w-full rounded-[18px]" />
          <Skeleton className="h-24 w-full rounded-[18px]" />
        </div>
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-surface border border-border rounded-[18px] p-5 space-y-3">
            <Skeleton className="h-3 w-28" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[18px]" />
          ))}
        </div>
      </div>
    </div>
  )
}