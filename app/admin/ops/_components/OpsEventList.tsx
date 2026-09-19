'use client'

import { AlertTriangle, ChevronRight, Code, FileText, Info } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import usePagination from '@/lib/hooks/usePagination'

type OpsEvent = {
  id: string
  kind: string | null
  level: string | null
  message: string | null
  source: string | null
  metadata: unknown
  created_at: string
}

const kindLabel: Record<string, string> = {
  gemini: 'Gemini',
  job: 'Job',
  rate_limit: 'Rate Limit',
  slow_call: 'Slow Call',
  cron: 'Cron',
  system: 'System',
}

const kindBadge: Record<string, { bg: string; text: string; border: string }> = {
  gemini: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  job: { bg: 'bg-mint', text: 'text-sage-dark', border: 'border-sage/30' },
  rate_limit: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  slow_call: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  cron: { bg: 'bg-mint/60', text: 'text-sage-dark', border: 'border-sage/30' },
  system: { bg: 'bg-canvas', text: 'text-muted', border: 'border-border' },
}

const levelConfig: Record<string, {
  label: string
  classes: string
  iconBg: string
  icon: React.ReactNode
  dot: string
}> = {
  info: {
    label: 'INFO',
    classes: 'text-sky-800 bg-sky-50 border-sky-200',
    iconBg: 'bg-sky-100 text-sky-700',
    dot: 'bg-sky-500',
    icon: (
      <Info className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  warn: {
    label: 'WARN',
    classes: 'text-amber-800 bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    icon: (
      <AlertTriangle className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  error: {
    label: 'ERROR',
    classes: 'text-red-700 bg-red-50 border-red-200',
    iconBg: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    icon: (
      <Info className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
}

export default function OpsEventList({ events, error }: { events: OpsEvent[]; error?: string | null }) {
  const pag = usePagination(events)

  return (
    <>
      <ul className="divide-y divide-border">
        {events.length === 0 && (
          <li className="px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-canvas flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-muted" strokeWidth={1.8} />
            </div>
            <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-1">
              Tidak Ada Event
            </p>
            <p className="text-sm text-muted">
              {error ? `Gagal memuat: ${error}` : 'Belum ada event tercatat'}
            </p>
          </li>
        )}
        {pag.pageItems.map((e) => {
          const level = levelConfig[e.level ?? 'info'] ?? levelConfig.info
          const kind = kindBadge[e.kind ?? ''] ?? kindBadge.system
          const kindText = kindLabel[e.kind ?? ''] ?? e.kind
          const metadata = e.metadata as Record<string, unknown> | null
          const hasMetadata = metadata && Object.keys(metadata).length > 0

          return (
            <li key={e.id} className="px-6 py-4 hover:bg-canvas/40 transition-colors">
              <div className="flex items-start gap-3.5">
                {/* Level icon */}
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${level.iconBg}`}>
                  {level.icon}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 rounded-full border ${level.classes}`}>
                        {level.label}
                      </span>
                      <span className={`inline-flex items-center text-[10px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 rounded border ${kind.bg} ${kind.text} ${kind.border}`}>
                        {kindText}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted tabular-nums flex-shrink-0 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-ink font-medium leading-relaxed">{e.message}</p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    {e.source && (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Code className="w-3 h-3" strokeWidth={2} />
                        {e.source}
                      </span>
                    )}
                  </div>

                  {hasMetadata && (
                    <details className="mt-2.5 group">
                      <summary className="text-[11px] font-semibold text-sage-dark cursor-pointer hover:underline select-none flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" strokeWidth={2.5} />
                        Lihat metadata ({Object.keys(metadata).length} keys)
                      </summary>
                      <pre className="mt-2 text-[11px] text-ink bg-canvas border border-border rounded-xl px-4 py-3 overflow-x-auto font-mono leading-relaxed">
                        {JSON.stringify(e.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {events.length > 0 && (
        <div className="px-6 py-3.5 border-t border-border">
          <Pagination {...pag} onPageChange={pag.goToPage} />
        </div>
      )}
    </>
  )
}