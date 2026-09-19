import { Skeleton, SkeletonList } from '@/components/ui/skeletons'

export default function AdminVerificationLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <SkeletonList rows={6} />
    </div>
  )
}