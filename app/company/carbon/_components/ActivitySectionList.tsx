'use client'

import Link from 'next/link'
import { ArrowRight, Check, FileText, X } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import usePagination from '@/lib/hooks/usePagination'
import DeleteDraftButton from './DeleteDraftButton'
import DeleteConfirmedButton from './DeleteConfirmedButton'

export type ActivityType = 'combustion' | 'vehicle' | 'fugitive' | 'energy' | 's3c1' | 's3c2'

export type ActivityEntry = {
  id: string
  type: ActivityType
  label: string
  sub: string
  emission: number | null
  status: string
  period: string
  href: string
}

export function fmt(kg: number | null) {
  if (kg === null) return '—'
  const t = kg / 1000
  return t >= 1000 ? `${(t / 1000).toFixed(3)} ktCO₂e` : `${t.toFixed(4)} tCO₂e`
}

const statusConfig: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
  draft: {
    label: 'Draft',
    classes: 'text-amber-800 bg-amber-50 border-amber-200',
    icon: (
      <FileText className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  confirmed: {
    label: 'Confirmed',
    classes: 'text-sage-dark bg-mint border-sage/30',
    icon: (
      <Check className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  rejected: {
    label: 'Rejected',
    classes: 'text-red-700 bg-red-50 border-red-200',
    icon: (
      <X className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
}

export default function ActivitySectionList({ entries }: { entries: ActivityEntry[] }) {
  const pag = usePagination(entries)

  return (
    <>
      <ul className="divide-y divide-border">
        {pag.pageItems.map((e) => {
          const status = statusConfig[e.status] ?? statusConfig.draft
          return (
            <li key={e.id} className="px-4 py-3.5 hover:bg-canvas/40 transition-colors sm:px-6 sm:py-4">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-ink tracking-tight truncate flex-1 min-w-0">{e.label}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border flex-shrink-0 sm:hidden ${status.classes}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-muted tabular-nums truncate min-w-0 flex-1">
                      {e.sub} · {new Date(e.period).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 mt-2 sm:mt-0 sm:flex-shrink-0 sm:justify-end">
                  {e.emission !== null && (
                    <span className="text-sm font-extrabold text-ink tracking-tight tabular-nums">
                      {fmt(e.emission)}
                    </span>
                  )}
                  <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${status.classes}`}>
                    {status.icon}
                    {status.label}
                  </span>
                  {(e.status === 'draft' || e.status === 'confirmed') && (
                    <div className="flex items-center gap-2">
                      {e.status === 'draft' && (
                        <Link
                          href={e.href}
                          className="group inline-flex items-center gap-1 px-3 py-1.5 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5"
                        >
                          Review
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                        </Link>
                      )}
                      {e.status === 'draft' ? (
                        <DeleteDraftButton id={e.id} type={e.type} />
                      ) : (
                        <DeleteConfirmedButton id={e.id} type={e.type} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="px-4 py-3.5 border-t border-border sm:px-6">
        <Pagination {...pag} onPageChange={pag.goToPage} />
      </div>
    </>
  )
}