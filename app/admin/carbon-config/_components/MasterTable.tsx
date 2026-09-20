'use client'

import { useState } from 'react'
import { Ban, ChevronDown, LayoutGrid, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import EditModal, { type FieldDef } from './EditModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Pagination from '@/components/ui/Pagination'
import usePagination from '@/lib/hooks/usePagination'

type Column<T> = {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  className?: string
}

type Props<T extends { id: string; is_active: boolean }> = {
  rows: T[]
  columns: Column<T>[]
  onDeactivate?: (id: string) => Promise<void> | Promise<{ error?: string; success?: boolean }>
  editFields?: FieldDef[]
  editTable?: string
  editTitle?: string
  emptyText?: string
}

export default function MasterTable<T extends { id: string; is_active: boolean }>({
  rows, columns, onDeactivate, editFields, editTable, editTitle, emptyText = 'Belum ada data.',
}: Props<T>) {
  const router = useRouter()
  const [editRow, setEditRow] = useState<T | null>(null)
  const [deactivateRow, setDeactivateRow] = useState<T | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  async function handleDeactivate() {
    if (!onDeactivate || !deactivateRow) return
    setDeactivating(true)
    try {
      const result = await onDeactivate(deactivateRow.id)
      const err = (result as { error?: string })?.error
      if (err) {
        toast.error(err)
      } else {
        toast.success('Entri berhasil dinonaktifkan')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menonaktifkan entri')
    } finally {
      setDeactivating(false)
      setDeactivateRow(null)
      router.refresh()
    }
  }

  const active = rows.filter((r) => r.is_active)
  const inactive = rows.filter((r) => !r.is_active)

  const activePag = usePagination(active)
  const inactivePag = usePagination(inactive)

  function CellValue({ row, col }: { row: T; col: Column<T> }) {
    if (col.render) return <>{col.render(row)}</>
    const val = (row as Record<string, unknown>)[col.key as string]
    if (val === null || val === undefined) return <span className="text-muted/50">—</span>
    return <>{String(val)}</>
  }

  if (rows.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[18px] p-12 text-center shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
        <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center mx-auto mb-3">
          <LayoutGrid className="w-5 h-5 text-muted" strokeWidth={1.8} />
        </div>
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-1">
          Tidak Ada Data
        </p>
        <p className="text-sm text-muted">{emptyText}</p>
      </div>
    )
  }

  const showActions = !!onDeactivate || (!!editFields && !!editTable)

  return (
    <>
      {editRow && editFields && editTable && (
        <EditModal
          table={editTable}
          row={editRow as unknown as Record<string, unknown>}
          fields={editFields}
          title={editTitle ?? editTable}
          onClose={() => { setEditRow(null); router.refresh() }}
        />
      )}

      {onDeactivate && deactivateRow && (
        <ConfirmDialog
          isOpen={!!deactivateRow}
          onClose={() => setDeactivateRow(null)}
          onConfirm={handleDeactivate}
          title="Nonaktifkan entri ini?"
          message="Entri ini akan dinonaktifkan dan tidak dipakai lagi dalam perhitungan emisi."
          confirmLabel="Nonaktifkan"
          cancelLabel="Batal"
          loading={deactivating}
          danger
        />
      )}

      <div className="bg-surface border border-border rounded-[18px] overflow-hidden shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border bg-canvas/40 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
            Entries
          </span>
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
            {active.length} active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border">
                {columns.map((c) => (
                  <th key={String(c.key)} className={`text-left px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-muted ${c.className ?? ''}`}>
                    {c.label}
                  </th>
                ))}
                {showActions && <th className="px-5 py-3 w-40 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activePag.pageItems.map((row) => (
                <tr key={row.id} className="hover:bg-canvas/60 transition-colors">
                  {columns.map((c) => (
                    <td key={String(c.key)} className={`px-5 py-3 text-xs text-ink ${c.className ?? ''}`}>
                      <CellValue row={row} col={c} />
                    </td>
                  ))}
                  {showActions && (
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editFields && editTable && (
                          <button
                            onClick={() => setEditRow(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sage-dark hover:bg-mint rounded-md transition-colors"
                          >
                            <Pencil className="w-3 h-3" strokeWidth={2} />
                            Edit
                          </button>
                        )}
                        {onDeactivate && (
                          <button
                            onClick={() => setDeactivateRow(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Ban className="w-3 h-3" strokeWidth={2} />
                            Nonaktifkan
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {active.length > 0 && (
          <div className="px-5 py-3 border-t border-border">
            <Pagination {...activePag} onPageChange={activePag.goToPage} center />
          </div>
        )}

        {inactive.length > 0 && (
          <details className="border-t border-border">
            <summary className="px-5 py-2.5 text-xs text-muted cursor-pointer hover:bg-canvas/40 select-none flex items-center gap-2 font-medium">
              <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
              {inactive.length} entri nonaktif
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <tbody className="divide-y divide-border">
                  {inactivePag.pageItems.map((row) => (
                    <tr key={row.id} className="opacity-45">
                      {columns.map((c) => (
                        <td key={String(c.key)} className={`px-5 py-2.5 text-xs text-muted ${c.className ?? ''}`}>
                          <CellValue row={row} col={c} />
                        </td>
                      ))}
                      {showActions && <td className="px-5 py-2.5" />}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-border">
              <Pagination {...inactivePag} onPageChange={inactivePag.goToPage} center />
            </div>
          </details>
        )}
      </div>
    </>
  )
}