import { PageSkeleton, SkeletonCard } from '@/components/ui/skeletons'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <PageSkeleton>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </PageSkeleton>
    </div>
  )
}