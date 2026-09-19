import Skeleton from './Skeleton'

const BARS = [58, 86, 42, 72, 50, 90, 64, 38, 78, 55]

export default function SkeletonChart({ height = 'h-64' }: { height?: string }) {
  return (
    <div className="bg-surface border border-border rounded-[18px] p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className={`${height} relative overflow-hidden rounded-xl`}>
        <div className="absolute inset-0 flex items-end justify-around gap-3 px-10 pb-8 pt-4">
          {BARS.map((h, i) => (
            <div
              key={i}
              className="skeleton w-full rounded-t-lg"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}