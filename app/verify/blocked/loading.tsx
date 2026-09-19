import { Skeleton } from '@/components/ui/skeletons'
import Logo from '@/components/Logo'

export default function VerifyBlockedLoading() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-lg flex flex-col items-center text-center">
        <div className="flex items-center mb-10">
          <Logo height={96} />
        </div>
        <Skeleton className="w-20 h-20 rounded-[22px] mx-auto" />
        <Skeleton className="h-3.5 w-40 mt-6 mb-3" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-sm mt-3" />
        <Skeleton className="h-4 w-4/5 max-w-sm mt-1" />
        <div className="w-full max-w-md mt-6 space-y-3">
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}