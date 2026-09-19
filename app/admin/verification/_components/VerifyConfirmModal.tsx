'use client'

import React from 'react'
import { ArrowRight, CheckCircle2, Info, Loader2, X } from 'lucide-react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  action: 'approved' | 'rejected'
  count: number
  loading: boolean
}

export default function VerifyConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  count,
  loading,
}: Props) {
  const [note, setNote] = React.useState('')

  if (!isOpen) return null

  const isApprove = action === 'approved'
  const titleVerb = isApprove ? 'Verifikasi' : 'Tolak'
  const headline = count > 1 ? `${titleVerb} ${count} Entitas` : `${titleVerb} Entitas`

  const hero = isApprove
    ? {
        ring: 'bg-mint text-sage-dark ring-mint/60',
        button: 'bg-sage hover:bg-sage-dark',
        icon: <CheckCircle2 className="w-7 h-7" strokeWidth={1.8} />,
      }
    : {
        ring: 'bg-red-50 text-red-700 ring-red-100',
        button: 'bg-red-600 hover:bg-red-700',
        icon: <Info className="w-7 h-7" strokeWidth={1.8} />,
      }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-[22px] max-w-md w-full overflow-hidden shadow-[0_32px_64px_-16px_rgba(11,31,22,0.3)]">
        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <span className={`w-12 h-12 rounded-[14px] ring-4 ${hero.ring} flex items-center justify-center flex-shrink-0`}>
              {hero.icon}
            </span>
            <div>
              <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark mb-1">
                Konfirmasi
              </span>
              <h3 className="text-xl font-extrabold text-ink tracking-tight">
                {headline}
              </h3>
            </div>
          </div>
          <button
            onClick={() => {
              setNote('')
              onClose()
            }}
            disabled={loading}
            className="w-8 h-8 rounded-full hover:bg-canvas text-muted hover:text-ink disabled:opacity-50 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-5">
          <p className="text-sm text-muted leading-relaxed mb-4">
            {isApprove
              ? 'Entitas yang dipilih akan ditandai sebagai terverifikasi dan pemiliknya mendapat akses penuh ke platform.'
              : 'Entitas yang dipilih akan ditolak dan pemiliknya menerima notifikasi beserta catatan Anda.'}
          </p>
          <label className="block text-[11px] font-bold tracking-[0.14em] uppercase text-ink mb-2">
            Catatan Review <span className="text-muted font-normal normal-case tracking-normal">(opsional)</span>
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tambahkan catatan review..."
            className="w-full text-sm px-4 py-3 bg-canvas border border-border rounded-xl resize-none focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
          />
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-2.5">
          <button
            onClick={() => {
              setNote('')
              onClose()
            }}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-border bg-surface text-ink text-sm font-semibold rounded-full hover:border-sage hover:text-sage-dark transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={loading}
            className={`group flex-1 px-4 py-3 text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(11,31,22,0.3)] disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2 ${hero.button}`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                Memproses...
              </>
            ) : (
              <>
                {titleVerb}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}