import Skeleton from './Skeleton'

export default function SkeletonStatCard() {
  return (
    <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-8 rounded-[10px]" />
      </div>
      <Skeleton className="h-8 w-32 mt-4" />
      <Skeleton className="h-3 w-24 mt-3" />
    </div>
  )
}