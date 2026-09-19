'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  reviewCombustion,
  reviewVehicle,
  reviewFugitive,
  reviewEnergy,
  reviewS3C1,
  reviewS3C2,
} from '@/lib/supabase/actions/carbon-activity'
import { AlertTriangle, Check, Loader2, X } from 'lucide-react'

type ActivityType = 'combustion' | 'vehicle' | 'fugitive' | 'energy' | 's3c1' | 's3c2'

const reviewActions: Record<ActivityType, (id: string, action: 'confirmed' | 'rejected') => Promise<{ error?: string; success?: boolean }>> = {
  combustion: reviewCombustion,
  vehicle: reviewVehicle,
  fugitive: reviewFugitive,
  energy: reviewEnergy,
  s3c1: reviewS3C1,
  s3c2: reviewS3C2,
}

type Props = {
  id: string
  type: ActivityType
  status: string
}

export default function ReviewActions({ id, type, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAction(action: 'confirmed' | 'rejected') {
    setLoading(true)
    setError(null)

    const actionFn = reviewActions[type]
    const result = await actionFn(id, action)

    setLoading(false)
    if (result.error) {
      setError(result.error)
      toast.error(result.error)
      return
    }

    toast.success(action === 'confirmed' ? 'Aktivitas dikonfirmasi & masuk total emisi' : 'Aktivitas berhasil ditolak')
    router.push('/company/carbon')
    router.refresh()
  }

  if (status === 'confirmed' || status === 'rejected') {
    const isConfirmed = status === 'confirmed'
    return (
      <div className={`rounded-xl px-3 py-3 flex items-start gap-2.5 ${
        isConfirmed ? 'bg-mint border border-sage/30' : 'bg-red-50 border border-red-200'
      }`}>
        {isConfirmed ? (
          <>
            <span className="w-8 h-8 rounded-lg bg-sage text-white flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-sage-dark">Sudah dikonfirmasi</p>
              <p className="text-[11px] text-sage-dark/70 mt-0.5">Sudah masuk ke total emisi</p>
            </div>
          </>
        ) : (
          <>
            <span className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
              <X className="w-4 h-4" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-red-700">Sudah ditolak</p>
              <p className="text-[11px] text-red-700/70 mt-0.5">Tidak masuk ke total emisi</p>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={() => handleAction('confirmed')}
        disabled={loading}
        className="group w-full bg-sage hover:bg-sage-dark text-white py-2.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin w-4 h-4" />
            Memproses...
          </>
        ) : (
          <>
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Konfirmasi
          </>
        )}
      </button>

      <button
        onClick={() => handleAction('rejected')}
        disabled={loading}
        className="group w-full border-2 border-border hover:border-red-300 hover:bg-red-50 text-ink hover:text-red-700 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin w-4 h-4" />
            Memproses...
          </>
        ) : (
          <>
            <X className="w-4 h-4" strokeWidth={2} />
            Tolak
          </>
        )}
      </button>
    </div>
  )
}