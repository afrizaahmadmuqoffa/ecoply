'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  verifyEntity,
  bulkVerifyEntities,
} from '@/lib/supabase/actions/admin'
import VerifyConfirmModal from '../../_components/VerifyConfirmModal'
import { AlertTriangle, Check, Loader2, RefreshCw, X } from 'lucide-react'

type Props = {
  requestId: string
  entityId: string
  entityType: 'company' | 'recycler'
  reviewable: boolean
}

export default function EntityActions({
  requestId,
  entityId,
  entityType,
  reviewable,
}: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<{
    action: 'approved' | 'rejected'
  } | null>(null)
  const [modalSession, setModalSession] = useState(0)
  const [loading, setLoading] = useState<'approved' | 'rejected' | 'reopen' | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm(note: string) {
    if (!modal) return
    setError(null)
    setLoading(modal.action)
    const result = await verifyEntity({
      requestId,
      entityId,
      entityType,
      action: modal.action,
      note: note || undefined,
    })
    setLoading(null)
    if (result.error) {
      setError(result.error)
      toast.error(result.error)
      return
    }
    setModal(null)
    toast.success(modal.action === 'approved' ? 'Entitas berhasil diverifikasi' : 'Entitas berhasil ditolak')
    router.refresh()
  }

  async function handleReopen() {
    setError(null)
    setLoading('reopen')
    const result = await bulkVerifyEntities({
      items: [{ requestId, entityId, entityType }],
      action: 'reopen',
    })
    setLoading(null)
    if (result.error) {
      setError(result.error)
      toast.error(result.error)
      return
    }
    toast.success('Review berhasil dibuka ulang')
    router.refresh()
  }

  return (
    <>
      {error && (
        <div className="w-full bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-3 sm:mt-0">
          <p className="text-xs text-red-700 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
            {error}
          </p>
        </div>
      )}

      {reviewable ? (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            onClick={() => {
              setModal({ action: 'approved' })
              setModalSession((s) => s + 1)
            }}
            disabled={!!loading}
            className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Verifikasi
          </button>
          <button
            onClick={() => {
              setModal({ action: 'rejected' })
              setModalSession((s) => s + 1)
            }}
            disabled={!!loading}
            className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-full transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
            Tolak
          </button>
        </div>
      ) : (
        <button
          onClick={handleReopen}
          disabled={!!loading}
          className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-surface hover:border-sage hover:text-sage-dark text-ink text-sm font-semibold rounded-full transition-all disabled:opacity-50"
        >
          {loading === 'reopen' ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Memproses...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" strokeWidth={2} />
              Buka Ulang Review
            </>
          )}
        </button>
      )}

      <VerifyConfirmModal
        key={modalSession}
        isOpen={!!modal}
        onClose={() => setModal(null)}
        onConfirm={handleConfirm}
        action={modal?.action ?? 'approved'}
        count={1}
        loading={loading === 'approved' || loading === 'rejected'}
      />
    </>
  )
}