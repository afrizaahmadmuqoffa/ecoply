import { Skeleton, SkeletonProfile } from '@/components/ui/skeletons'

export default function AdminVerificationEntityLoading() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="bg-surface border border-border rounded-[22px] p-6 sm:p-8 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-56" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-32 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <SkeletonProfile />
        <SkeletonProfile />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-48 w-full rounded-[18px]" />
        <Skeleton className="h-48 w-full rounded-[18px]" />
      </div>
    </div>
  )
}