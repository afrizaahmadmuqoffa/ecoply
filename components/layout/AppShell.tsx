'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'

type Props = {
  sidebar: ReactNode
  userName?: string
  children: ReactNode
  contentClassName?: string
  avatarColor?: 'ink' | 'sage'
}

export default function AppShell({
  sidebar,
  userName,
  children,
  contentClassName = 'p-4 sm:p-6 lg:p-8',
  avatarColor = 'ink',
}: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="flex h-dvh bg-canvas">
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">{sidebar}</div>

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="flex h-14 items-center justify-between gap-3 bg-surface border-b border-border px-3 lg:hidden flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-2 py-2 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" strokeWidth={2} />
            <span className="font-bold text-xs tracking-tight text-ink">Menu</span>
          </button>

          {userName ? (
            <span className={`w-7 h-7 rounded-full ${avatarColor === 'sage' ? 'bg-sage' : 'bg-ink'} text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 ring-2 ring-canvas`}>
              {(userName.trim().charAt(0) || '?').toUpperCase()}
            </span>
          ) : (
            <span className="w-7 h-7" />
          )}
        </div>

        <main className="flex-1 overflow-y-auto min-w-0">
          <div className={`max-w-[1600px] mx-auto ${contentClassName}`}>{children}</div>
        </main>
      </div>

      {/* Drawer backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[70] bg-ink/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden
      />

      {/* Drawer */}
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a')) setOpen(false)
        }}
        className={`fixed inset-y-0 left-0 z-[80] h-full w-64 transform transition-transform duration-200 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative h-full w-64">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-3 z-10 w-8 h-8 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
          {sidebar}
        </div>
      </div>
    </div>
  )
}