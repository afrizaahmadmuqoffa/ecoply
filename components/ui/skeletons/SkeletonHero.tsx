import Skeleton from './Skeleton'

export default function SkeletonHero({
  large = true,
  subtitle = true,
}: {
  large?: boolean
  subtitle?: boolean
}) {
  return (
    <div className="mb-6 space-y-3">
      <Skeleton className="h-3.5 w-32 sm:w-40" />
      <Skeleton className={`${large ? 'h-9 w-56 sm:w-64' : 'h-7 w-44 sm:w-52'}`} />
      {subtitle && <Skeleton className="h-4 w-full max-w-2xl" />}
    </div>
  )
}