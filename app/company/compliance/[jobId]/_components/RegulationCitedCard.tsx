'use client'

import { useState } from 'react'
import { BookOpen, ChevronDown } from 'lucide-react'

type Props = {
  regulation: {
    id: string
    title: string
    excerpts?: string[]
  }
  fullTexts?: string[]
}

export default function RegulationCitedCard({ regulation, fullTexts }: Props) {
  const [expanded, setExpanded] = useState(false)
  const excerpts = fullTexts && fullTexts.length > 0 ? fullTexts : (regulation.excerpts ?? [])
  const isFull = fullTexts && fullTexts.length > 0

  return (
    <div className="bg-surface border border-border rounded-[18px] overflow-hidden shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-canvas/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-mint text-sage-dark flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink tracking-tight truncate">
              {regulation.title}
            </p>
            {excerpts.length > 0 && (
              <p className="text-[11px] text-muted mt-0.5">
                {excerpts.length} {excerpts.length === 1 ? 'kutipan' : 'kutipan'} dari dokumen
              </p>
            )}
          </div>
          {excerpts.length > 0 && (
            <span className={`text-muted flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
            </span>
          )}
        </div>
      </button>

      {expanded && excerpts.length > 0 && (
        <div className="border-t border-border bg-canvas/30 divide-y divide-border">
          {excerpts.map((excerpt, i) => (
            <div key={i} className="px-5 py-4">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-2">
                Kutipan {i + 1} {isFull && (
                  <span className="ml-1 text-sage-dark normal-case font-semibold">(teks lengkap)</span>
                )}
              </p>
              <blockquote className="text-sm text-ink leading-relaxed border-l-[3px] border-sage pl-4 bg-surface py-3 pr-4 rounded-r-xl whitespace-pre-wrap break-words">
                {excerpt}
              </blockquote>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}