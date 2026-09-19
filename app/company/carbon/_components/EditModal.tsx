'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Pencil, X } from 'lucide-react'

type Props = {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
}

export default function EditModal({ isOpen, onClose, title, subtitle, children }: Props) {
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/50 backdrop-blur-sm px-4 py-8 overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-surface rounded-[22px] shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)] my-auto overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-border sticky top-0 bg-surface rounded-t-[22px] z-10">
          <div className="flex items-start gap-3 min-w-0">
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-ink tracking-tight truncate">{title}</h2>
              {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-5 max-h-[calc(90vh-100px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}