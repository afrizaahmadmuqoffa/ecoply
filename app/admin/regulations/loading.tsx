import { Skeleton, SkeletonList } from '@/components/ui/skeletons'

export default function AdminRegulationsLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <div className="bg-surface border border-border rounded-[18px] p-6">
            <Skeleton className="h-5 w-40 mb-5" />
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-12 w-full rounded-full mt-5" />
          </div>
        </div>
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-surface border border-border rounded-[18px] p-6">
            <Skeleton className="h-5 w-32 mb-5" />
            <SkeletonList rows={5} />
          </div>
        </div>
      </div>
    </div>
  )
}