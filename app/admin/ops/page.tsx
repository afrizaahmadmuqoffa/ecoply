import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle, ChevronRight, Code, FileText, Info } from 'lucide-react'

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

export default async function AdminOpsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: events, error } = await supabase
    .from('ops_events')
    .select('id, kind, level, message, source, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
          Log <span className="text-sage">Operasional.</span>
        </h1>
        <p className="mt-3 text-sm text-muted max-w-2xl">
          Kejadian sistem: error Gemini, rate limit, cron jobs, dan panggilan lambat. Data 200 event terbaru ditampilkan secara read-only.
        </p>
      </div>

      {/* List */}
      <div className="bg-surface border border-border rounded-[18px] overflow-hidden shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
        {/* List header */}
        <div className="px-6 py-3.5 border-b border-border bg-canvas/40 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
            Event Log
          </span>
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
            {events?.length ?? 0} entries
          </span>
        </div>

        <ul className="divide-y divide-border">
          {!events?.length && (
            <li className="px-6 py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-canvas flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-muted" strokeWidth={1.8} />
              </div>
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-1">
                Tidak Ada Event
              </p>
              <p className="text-sm text-muted">
                {error ? `Gagal memuat: ${error.message}` : 'Belum ada event tercatat'}
              </p>
            </li>
          )}
          {events?.map((e) => {
            const level = levelConfig[e.level] ?? levelConfig.info
            const kind = kindBadge[e.kind] ?? kindBadge.system
            const kindText = kindLabel[e.kind] ?? e.kind
            const hasMetadata = e.metadata && Object.keys(e.metadata as Record<string, unknown>).length > 0

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
                          Lihat metadata ({Object.keys(e.metadata as Record<string, unknown>).length} keys)
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
      </div>
    </div>
  )
}