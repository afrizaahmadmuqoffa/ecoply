import Skeleton from './Skeleton'

export default function PageSkeleton({
  hero = true,
  children,
}: {
  hero?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="animate-fade-in">
      {hero && (
        <div className="mb-6 space-y-3">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
      )}
      {children}
    </div>
  )
}