'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, KeyRound, X } from 'lucide-react'

export const DEMO_ACCOUNTS = [
  {
    role: 'Admin',
    email: 'demo@admin.com',
    password: 'Demo123!',
  },
  {
    role: 'Company',
    email: 'demo@company.com',
    password: 'Demo123!',
  },
  {
    role: 'Recycler',
    email: 'demo@recycler.com',
    password: 'Demo123!',
  },
] as const

type Props = {
  isOpen: boolean
  onClose: () => void
}

export default function DemoAccountsModal({ isOpen, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

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

  async function copyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500)
    } catch {
      // clipboard tidak tersedia — abaikan
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-surface rounded-[22px] max-w-lg w-full overflow-hidden shadow-[0_32px_64px_-16px_rgba(11,31,22,0.3)] max-h-[90vh] flex flex-col">
        <div className="p-6 pb-4 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="flex items-start gap-4 min-w-0">
            <span className="w-12 h-12 rounded-[14px] bg-mint text-sage-dark ring-4 ring-mint/60 flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-6 h-6" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-muted mb-1">
                ECOPLY — Demo
              </span>
              <h3 className="text-xl font-extrabold text-ink tracking-tight">
                Akun Demo
              </h3>
              <p className="text-xs text-muted mt-1">
                Gunakan kredensial di bawah untuk mengeksplorasi aplikasi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-3 overflow-y-auto">
          {DEMO_ACCOUNTS.map((acc) => (
            <div
              key={acc.role}
              className="border border-border rounded-xl bg-canvas/60 p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-sm font-extrabold text-ink tracking-tight">
                  {acc.role}
                </p>
              </div>

              <div className="space-y-2">
                {(
                  [
                    ['email', acc.email],
                    ['password', acc.password],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2"
                  >
                    <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted w-16 flex-shrink-0">
                      {label}
                    </span>
                    <code className="flex-1 text-sm text-ink font-mono truncate">
                      {value}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyValue(`${acc.role}:${label}`, value)}
                      className="w-7 h-7 rounded-md hover:bg-mint/60 text-muted hover:text-sage-dark flex items-center justify-center transition-colors flex-shrink-0"
                      aria-label={`Salin ${label} ${acc.role}`}
                    >
                      {copied === `${acc.role}:${label}` ? (
                        <Check className="w-3.5 h-3.5 text-sage-dark" strokeWidth={2.5} />
                      ) : (
                        <Copy className="w-3.5 h-3.5" strokeWidth={2} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}