'use client'

import { useEffect } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  danger?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  loading = false,
  danger = true,
}: Props) {
  useEffect(() => {
    if (!isOpen) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-surface rounded-[22px] max-w-md w-full overflow-hidden shadow-[0_32px_64px_-16px_rgba(11,31,22,0.3)]">
        <div className="p-6 pb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-4 min-w-0">
            <span
              className={`w-12 h-12 rounded-[14px] ring-4 flex items-center justify-center flex-shrink-0 ${
                danger
                  ? 'bg-red-50 text-red-700 ring-red-100'
                  : 'bg-mint text-sage-dark ring-mint/60'
              }`}
            >
              {danger ? (
                <AlertTriangle className="w-6 h-6" strokeWidth={1.8} />
              ) : (
                <X className="w-6 h-6" strokeWidth={1.8} />
              )}
            </span>
            <div className="min-w-0">
              <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-muted mb-1">
                Konfirmasi
              </span>
              <h3 className="text-xl font-extrabold text-ink tracking-tight break-words">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full hover:bg-canvas text-muted hover:text-ink disabled:opacity-50 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-5">
          <p className="text-sm text-muted leading-relaxed">{message}</p>
        </div>

        <div className="px-6 pb-6 flex gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-border bg-surface text-ink text-sm font-semibold rounded-full hover:border-sage hover:text-sage-dark transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`group flex-1 px-4 py-3 text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(11,31,22,0.3)] disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-sage hover:bg-sage-dark'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                Memproses...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}