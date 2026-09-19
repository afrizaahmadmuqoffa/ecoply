'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { verifyEntity, bulkVerifyEntities } from '@/lib/supabase/actions/admin'
import { AlertTriangle, Check, X } from 'lucide-react'
import VerificationCard from './VerificationCard'
import VerifyConfirmModal from './VerifyConfirmModal'

type Item = {
  request: {
    id: string
    entity_type: 'company' | 'recycler'
    entity_id: string
    status: string
    note: string | null
    created_at: string
    reviewed_at: string | null
  }
  entity?: {
    id: string
    name: string
    type: 'company' | 'recycler'
    segment?: string | null
  }
}

type Props = {
  pending: Item[]
  reviewed: Item[]
}

export default function VerificationList({ pending, reviewed }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<{
    action: 'approved' | 'rejected'
    count: number
  } | null>(null)
  const [modalSession, setModalSession] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(requestId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(requestId)) next.delete(requestId)
      else next.add(requestId)
      return next
    })
  }

  function toggleAll(add: boolean) {
    setSelected(add ? new Set(pending.map((i) => i.request.id)) : new Set())
  }

  const allPendingSelected =
    pending.length > 0 && selected.size === pending.length

  async function handleConfirm(note: string) {
    if (!modal) return
    setError(null)
    setLoading(true)

    const items = pending
      .filter((i) => selected.has(i.request.id))
      .map((i) => ({
        requestId: i.request.id,
        entityId: i.request.entity_id,
        entityType: i.request.entity_type as 'company' | 'recycler',
      }))

    // Single item: pakai verifyEntity (revalidasi via server action)
    // Multiple: pakai bulkVerifyEntities
    const result =
      items.length === 1
        ? await verifyEntity({ ...items[0], action: modal.action, note: note || undefined })
        : await bulkVerifyEntities({
            items,
            action: modal.action,
            note: note || undefined,
          })

    setLoading(false)
    if (result.error) {
      setError(result.error)
      toast.error(result.error)
      return
    }

    setModal(null)
    setSelected(new Set())
    toast.success(
      `${items.length} entitas berhasil ${modal.action === 'approved' ? 'diverifikasi' : 'ditolak'}`
    )
    router.refresh()
  }

  return (
    <div className="pb-24">
      {/* Errors */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-ink tracking-tight flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden />
              Menunggu Review
              <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            </h2>
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none hover:text-ink transition-colors">
              <span className="relative inline-flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="w-4 h-4 rounded border-2 border-border bg-surface peer-checked:bg-sage peer-checked:border-sage transition-colors flex items-center justify-center">
                  {allPendingSelected && (
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  )}
                </span>
              </span>
              <span className="font-medium">Pilih semua</span>
            </label>
          </div>
          <div className="space-y-3">
            {pending.map((item) => (
              <VerificationCard
                key={item.request.id}
                request={item.request}
                entity={item.entity}
                selected={selected.has(item.request.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        </section>
      )}

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-ink tracking-tight flex items-center gap-2.5 mb-4">
            <span className="w-2 h-2 rounded-full bg-muted" aria-hidden />
            Sudah Direview
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted bg-canvas px-2 py-0.5 rounded-full">
              {reviewed.length}
            </span>
          </h2>
          <div className="space-y-3">
            {reviewed.map((item) => (
              <VerificationCard
                key={item.request.id}
                request={item.request}
                entity={item.entity}
                readonly
              />
            ))}
          </div>
        </section>
      )}

      {/* Floating action bar - offset agar center terhadap main area (bukan viewport) */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-6 z-40 left-1/2 -translate-x-1/2 lg:left-[calc(50%+8rem)] lg:-translate-x-1/2"
          style={{ width: 'min(90vw, 560px)' }}
        >
          <div className="bg-gray-800 text-white rounded-full shadow-[0_24px_48px_-12px_rgba(11,31,22,0.4)] px-4 py-3 flex items-center gap-3 ring-1 ring-white/10">
            <div className="flex items-center gap-2 pl-2 min-w-0">
              <span className="w-7 h-7 rounded-full bg-sage text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                {selected.size}
              </span>
              <p className="text-sm font-medium truncate">entitas terpilih</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
              <button
                onClick={() => {
                  setModal({ action: 'approved', count: selected.size })
                  setModalSession((s) => s + 1)
                }}
                disabled={loading}
                className="px-3.5 py-1.5 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                Verifikasi
              </button>
              <button
                onClick={() => {
                  setModal({ action: 'rejected', count: selected.size })
                  setModalSession((s) => s + 1)
                }}
                disabled={loading}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                Tolak
              </button>
              <button
                onClick={() => setSelected(new Set())}
                disabled={loading}
                className="px-3 py-1.5 text-white/70 hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <VerifyConfirmModal
        key={modalSession}
        isOpen={!!modal}
        onClose={() => setModal(null)}
        onConfirm={handleConfirm}
        action={modal?.action ?? 'approved'}
        count={modal?.count ?? 0}
        loading={loading}
      />
    </div>
  )
}