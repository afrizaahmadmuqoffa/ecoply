'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { respondToCompanyRequest } from '@/lib/supabase/actions/marketplace'
import Pagination from '@/components/ui/Pagination'
import usePagination from '@/lib/hooks/usePagination'
import { AlertTriangle, Calendar, Check, Clock, MessageCircle, X } from 'lucide-react'

export type IncomingRequest = {
  id: string
  listing_id: string
  price: number | null
  status: string
  note: string | null
  created_at: string
  pickup_scheduled_at: string | null
  pickup_note: string | null
  waste_listings: {
    id: string
    material_type: string
    category: string
    weight: number
    unit: string
    address_text: string
    free_for_pickup: boolean
    status: string
    companies: { id: string; name: string } | null
  } | null
}

const REQUEST_STATUS_CONFIG: Record<string, {
  label: string
  classes: string
  icon: React.ReactNode
}> = {
  pending: {
    label: 'Menunggu',
    classes: 'text-amber-800 bg-amber-50 border-amber-200',
    icon: (
      <Clock className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  accepted: {
    label: 'Diterima',
    classes: 'text-sage-dark bg-mint border-sage/30',
    icon: (
      <Check className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  rejected: {
    label: 'Ditolak',
    classes: 'text-red-700 bg-red-50 border-red-200',
    icon: (
      <X className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  cancelled: {
    label: 'Dibatalkan',
    classes: 'text-muted bg-canvas border-border',
    icon: (
      <X className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
}

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'accepted', label: 'Diterima' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

type Props = {
  requests: IncomingRequest[]
  onRefresh: () => void
}

export default function RequestListSection({ requests, onRefresh }: Props) {
  const [filter, setFilter] = useState('')
  const [processing, setProcessing] = useState(false)
  const [actionMsg, setActionMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const filtered = filter
    ? requests.filter((r) => r.status === filter)
    : requests
  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const pag = usePagination(filtered)

  const handleRespond = async (bidId: string, action: 'accept' | 'reject') => {
    setProcessing(true)
    setActionMsg(null)
    const formData = new FormData()
    formData.append('bid_id', bidId)
    formData.append('action', action)
    const result = await respondToCompanyRequest(formData)
    setProcessing(false)
    if (result.error) {
      setActionMsg({ type: 'error', text: result.error as string })
      toast.error(result.error as string)
    } else {
      setActionMsg({
        type: 'success',
        text: action === 'accept' ? 'Request diterima! Diskusi via chat.' : 'Request ditolak.',
      })
      toast.success(action === 'accept' ? 'Request diterima! Diskusi via chat.' : 'Request ditolak.')
      onRefresh()
    }
  }

  if (requests.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[18px] p-12 text-center shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
        <div className="w-16 h-16 rounded-2xl bg-mint border border-sage/30 flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8 text-sage-dark" strokeWidth={1.8} />
        </div>
        <h2 className="text-sm font-extrabold text-ink tracking-tight mb-1.5">
          Tidak Ada Request Masuk
        </h2>
        <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
          Belum ada permintaan pickup dari perusahaan. Setiap request baru akan muncul di sini.
        </p>
      </div>
    )
  }

  return (
    <div>
      {actionMsg && (
        <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 ${
          actionMsg.type === 'success'
            ? 'bg-mint border border-sage/30'
            : 'bg-red-50 border border-red-200'
        }`}>
          {actionMsg.type === 'success' ? (
            <Check className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
          )}
          <p className={`text-xs ${actionMsg.type === 'success' ? 'text-sage-dark' : 'text-red-700'}`}>
            {actionMsg.text}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 mr-1 text-[11px] font-bold tracking-[0.14em] uppercase text-muted">
          {requests.length} total
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 font-bold tracking-wider uppercase rounded-full border border-amber-200 normal-case">
              {pendingCount} baru
            </span>
          )}
        </span>
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value || 'all'}
            type="button"
            onClick={() => {
              setFilter(opt.value)
              pag.goToPage(1)
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === opt.value
                ? 'bg-sage text-white shadow-[0_4px_10px_-4px_rgba(85,158,123,0.5)]'
                : 'bg-surface border border-border text-muted hover:border-sage hover:text-sage-dark'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-[18px] overflow-hidden shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
        {filtered.length === 0 ? (
          <p className="text-center text-xs text-muted py-12">
            Tidak ada request dengan status ini.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {pag.pageItems.map((req) => {
              const listing = req.waste_listings
              const company = listing?.companies
              const isPending = req.status === 'pending'
              const status = REQUEST_STATUS_CONFIG[req.status] || REQUEST_STATUS_CONFIG.pending

              return (
                <div key={req.id} className="px-5 py-4 hover:bg-canvas/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {company?.id ? (
                          <Link
                            href={`/recycler/marketplace/companies/${company.id}`}
                            className="text-sm font-bold text-ink tracking-tight hover:text-sage-dark transition-colors"
                          >
                            {company?.name || 'Company'}
                          </Link>
                        ) : (
                          <span className="text-sm font-bold text-ink">{company?.name || 'Company'}</span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold tracking-wider uppercase ${status.classes}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted truncate">
                        {listing?.material_type} ({listing?.weight} {listing?.unit}) — {listing?.address_text}
                      </p>
                      {req.note && (
                        <p className="text-xs text-muted mt-1.5 italic bg-canvas p-2 rounded-lg border border-border inline-block max-w-full">
                          &quot;{req.note}&quot;
                        </p>
                      )}
                      <p className="text-[10px] text-muted mt-1.5 tabular-nums">
                        {new Date(req.created_at).toLocaleString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {req.price !== null && (
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-extrabold text-ink tracking-tight tabular-nums">
                          Rp {req.price.toLocaleString('id-ID')}
                        </p>
                        <p className="text-[10px] text-muted">per kg</p>
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                      <button
                        disabled={processing}
                        onClick={() => handleRespond(req.id, 'accept')}
                        className="group flex-1 bg-sage hover:bg-sage-dark text-white py-2 rounded-full text-xs font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Terima
                      </button>
                      <button
                        disabled={processing}
                        onClick={() => handleRespond(req.id, 'reject')}
                        className="group flex-1 border-2 border-border hover:border-red-300 hover:bg-red-50 text-ink hover:text-red-700 py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Tolak
                      </button>
                    </div>
                  )}

                  {req.status === 'accepted' && (
                    <div className="mt-3 pt-3 border-t border-sage/20 space-y-2">
                      {req.pickup_scheduled_at && (
                        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs space-y-1">
                          <p className="font-bold text-sky-900 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                            Jadwal Pickup Dikonfirmasi
                          </p>
                          <p className="text-sky-800 tabular-nums">
                            {new Date(req.pickup_scheduled_at).toLocaleString('id-ID', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                          {req.pickup_note && (
                            <p className="text-sky-700">{req.pickup_note}</p>
                          )}
                        </div>
                      )}
                      <Link
                        href={`/recycler/marketplace/${req.listing_id}/chat`}
                        className="group w-full inline-flex items-center justify-center gap-2 py-2.5 bg-sage hover:bg-sage-dark text-white text-xs font-bold rounded-full transition-all hover:-translate-y-0.5"
                      >
                        <MessageCircle className="w-4 h-4" strokeWidth={2} />
                        Chat dengan {company?.name || 'Company'}
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Pagination {...pag} onPageChange={pag.goToPage} />
    </div>
  )
}