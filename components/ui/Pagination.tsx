'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  center?: boolean
}

function getPageItems(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const items: (number | '…')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  if (start > 2) items.push('…')
  for (let i = start; i <= end; i++) items.push(i)
  if (end < totalPages - 1) items.push('…')
  items.push(totalPages)
  return items
}

export default function Pagination({ page, totalPages, total, pageSize, onPageChange, center = false }: Props) {
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const pages = getPageItems(page, totalPages)

  const navBtn =
    'w-8 h-8 flex items-center justify-center rounded-full border border-border bg-surface text-ink hover:border-sage hover:text-sage-dark transition-colors disabled:opacity-35 disabled:hover:border-border disabled:hover:text-ink disabled:cursor-not-allowed'
  const pageBtn = (active: boolean) =>
    `w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
      active
        ? 'bg-sage text-white shadow-[0_4px_10px_-4px_rgba(85,158,123,0.5)]'
        : 'border border-border bg-surface text-ink hover:border-sage hover:text-sage-dark'
    }`

  return (
    <div
      className={`mt-5 flex gap-3 flex-col items-center ${
        center ? '' : 'sm:flex-row sm:justify-between'
      }`}
    >
      <p className={`text-[11px] text-muted tabular-nums w-full text-center ${
        center ? '' : 'sm:w-auto sm:text-left'
      }`}>
        Menampilkan <span className="font-bold text-ink">{start}–{end}</span> dari{' '}
        <span className="font-bold text-ink">{total}</span>
      </p>
      <nav className="flex items-center gap-1.5" aria-label="Pagination">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={navBtn}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-muted">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={pageBtn(p === page)}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={navBtn}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </nav>
    </div>
  )
}