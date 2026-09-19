'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type SourceEvidenceItem = {
  page_number?: number | null
  section_title?: string | null
  similarity?: number | null
  text_chunk: string
}

export type SourceRegulationItem = {
  regulation_id: string
  regulation_title: string
  similarity?: number | null
  text_chunk: string
}

export type AreaSource = {
  area: string
  evidence: SourceEvidenceItem[]
  regulations: SourceRegulationItem[]
}

export default function EvidenceSourcePanel({ sources }: { sources: AreaSource }) {
  const [open, setOpen] = useState(false)
  const total = sources.evidence.length + sources.regulations.length

  if (total === 0) return null

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] uppercase text-sage-dark hover:text-ink transition-colors"
      >
        <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
        </span>
        {open ? 'Sembunyikan teks sumber lengkap' : `Lihat teks sumber lengkap (${total})`}
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {sources.evidence.map((e, i) => (
            <div key={`e${i}`} className="bg-canvas border border-border rounded-lg px-3.5 py-3">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-sage-dark">
                  Evidence {i + 1} · Dokumen
                </span>
                {e.page_number != null && (
                  <span className="text-[10px] font-mono text-muted bg-surface border border-border px-1.5 py-0.5 rounded">
                    hlm. {e.page_number}
                  </span>
                )}
                {e.section_title && (
                  <span className="text-[10px] text-muted">{e.section_title}</span>
                )}
                {e.similarity != null && (
                  <span className="text-[10px] font-mono text-muted/70" title="Densitas kata kunci (full-text search)">
                    densitas {e.similarity.toFixed(3)}
                  </span>
                )}
              </div>
              <blockquote className="text-xs text-ink leading-relaxed border-l-[3px] border-sage pl-3 whitespace-pre-wrap break-words">
                {e.text_chunk}
              </blockquote>
            </div>
          ))}

          {sources.regulations.map((r, i) => (
            <div key={`r${i}`} className="bg-surface border border-border rounded-lg px-3.5 py-3">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
                  Referensi {i + 1}
                </span>
                <span className="text-[10px] font-bold text-ink">{r.regulation_title}</span>
                {r.similarity != null && (
                  <span className="text-[10px] font-mono text-muted/70" title="Kemiripan semantik (embedding)">
                    relevansi {r.similarity.toFixed(2)}
                  </span>
                )}
              </div>
              <blockquote className="text-xs text-ink leading-relaxed border-l-[3px] border-border pl-3 whitespace-pre-wrap break-words">
                {r.text_chunk}
              </blockquote>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}