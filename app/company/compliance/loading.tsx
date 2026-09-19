import { Skeleton, SkeletonList } from '@/components/ui/skeletons'

export default function CompanyComplianceLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
        <div className="lg:col-span-2 lg:sticky lg:top-6 space-y-4">
          <div className="bg-surface border border-border rounded-[18px] p-6">
            <Skeleton className="h-5 w-44 mb-5" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-full mt-5" />
          </div>
        </div>
        <div className="lg:col-span-3">
          <SkeletonList rows={6} avatar={false} />
        </div>
      </div>
    </div>
  )
}