'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CarbonInputTabs, { type CarbonFactorsProps } from './CarbonInputTabs'
import ExtractionWorkflow from './ExtractionWorkflow'
import PromptWorkflow from './PromptWorkflow'
import { ChevronRight, FileText, Pencil, Plus, Sparkles, X } from 'lucide-react'

type Mode = 'manual' | 'upload' | 'prompt'

const MODES: { id: Mode; icon: React.ReactNode; label: string; desc: string; accent: string }[] = [
  {
    id: 'manual',
    icon: (
      <Pencil className="w-5 h-5" strokeWidth={1.8} />
    ),
    label: 'Manual',
    desc: 'Isi aktivitas emisi per scope & jenis aktivitas',
    accent: 'bg-sage text-white',
  },
  {
    id: 'upload',
    icon: (
      <FileText className="w-5 h-5" strokeWidth={1.8} />
    ),
    label: 'Upload',
    desc: 'Upload dokumen, AI ekstrak otomatis',
    accent: 'bg-sky-600 text-white',
  },
  {
    id: 'prompt',
    icon: (
      <Sparkles className="w-5 h-5" strokeWidth={1.8} />
    ),
    label: 'Prompt AI',
    desc: 'Ceritakan aktivitas, AI parse jadi data',
    accent: 'bg-purple-600 text-white',
  },
]

const TITLE: Record<Mode, string> = {
  manual: 'Input Manual',
  upload: 'Upload Dokumen',
  prompt: 'Input dengan AI',
}

const SUBTITLE: Record<Mode, string> = {
  manual: 'Isi aktivitas emisi per scope',
  upload: 'Ekstraksi otomatis dari laporan ESG',
  prompt: 'AI memparse teks menjadi data terstruktur',
}

export default function CarbonInputModal(props: CarbonFactorsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(() => Boolean(searchParams.get('input')))
  const [active, setActive] = useState<Mode | null>(null)

  const close = useCallback(() => {
    setActive(null)
    setMenuOpen(false)
  }, [])

  useEffect(() => {
    if (!active && !menuOpen) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [active, menuOpen, close])

  useEffect(() => {
    if (active) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [active])

  function handleDone() {
    router.refresh()
    close()
  }

  function selectMode(m: Mode) {
    setMenuOpen(false)
    setActive(m)
  }

  return (
    <>
      <div className="relative">
        {menuOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
        )}
        <button
          onClick={() => (active ? null : setMenuOpen(v => !v))}
          className="group relative z-50 inline-flex items-center gap-2 bg-sage hover:bg-sage-dark text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(85,158,123,0.4)] whitespace-nowrap"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
          Input Karbon
        </button>

        {menuOpen && (
          <div className="fixed inset-x-4 bottom-4 z-50 bg-surface border border-border rounded-[18px] shadow-[0_24px_48px_-12px_rgba(11,31,22,0.24)] max-sm:max-h-[70vh] max-sm:overflow-y-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-80 sm:bottom-auto sm:overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-canvas/40">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
                Pilih Metode Input
              </p>
            </div>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => selectMode(m.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-canvas/60 transition-colors border-b border-border last:border-b-0 group"
              >
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${m.accent} shadow-[0_8px_16px_-8px_rgba(11,31,22,0.2)] group-hover:-translate-y-0.5 transition-transform`}>
                  {m.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink tracking-tight">{m.label}</span>
                  <span className="block text-[11px] text-muted mt-0.5 leading-relaxed">{m.desc}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-muted/50 group-hover:text-sage group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-2" strokeWidth={2} />
              </button>
            ))}
          </div>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm px-4 py-8">
          <div className="fixed inset-0" onClick={close} />

          <div className="relative w-full max-w-3xl bg-surface rounded-[22px] shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark mb-0.5">
                    Input Karbon
                  </span>
                  <h2 className="text-base font-extrabold text-ink tracking-tight">{TITLE[active]}</h2>
                  <p className="text-xs text-muted mt-0.5 truncate">{SUBTITLE[active]}</p>
                </div>
              </div>
              <button
                onClick={close}
                className="w-9 h-9 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors flex-shrink-0"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="px-6 py-5 max-h-[calc(90vh-100px)] overflow-y-auto">
              {active === 'manual' && <CarbonInputTabs {...props} />}
              {active === 'upload' && <ExtractionWorkflow onDone={handleDone} />}
              {active === 'prompt' && <PromptWorkflow onDone={handleDone} />}
            </div>
          </div>
        </div>
      )}
    </>
  )
}