import { Skeleton } from '@/components/ui/skeletons'
import Logo from '@/components/Logo'

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-center mb-10">
          <Logo height={96} />
        </div>
        <div className="bg-surface border border-border rounded-[18px] p-6">
          <Skeleton className="h-9 w-48 mb-6" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Skeleton className="h-28 w-full rounded-[18px]" />
          <Skeleton className="h-28 w-full rounded-[18px]" />
        </div>
      </div>
    </div>
  )
}