'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Archive, Check, Eye, FileText, Info, Loader2 } from 'lucide-react'
import { archiveRegulation } from '@/lib/supabase/actions/admin'
import Pagination from '@/components/ui/Pagination'
import usePagination from '@/lib/hooks/usePagination'
import ChunkPreviewModal, { type EditableChunk } from './ChunkPreviewModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

type Regulation = {
  id: string
  title: string
  category: string
  version: string
  status: 'active' | 'archived'
  file_name: string | null
  file_size: number | null
  file_path: string | null
  is_embedded: boolean
  embedded_at: string | null
  chunk_count: number | null
  created_at: string
  updated_at: string
}

type Props = {
  title: string
  regulations: Regulation[]
  count: number
  muted?: boolean
}

function formatBytes(bytes: number | null) {
  if (!bytes) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const categoryColor: Record<string, { bg: string; text: string; border: string }> = {
  OJK: { bg: 'bg-mint/60', text: 'text-sage-dark', border: 'border-sage/30' },
  KLHK: { bg: 'bg-mint', text: 'text-sage-dark', border: 'border-sage/40' },
  ESDM: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  Kemenaker: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  Kemenperin: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'UU/PP': { bg: 'bg-ink/10', text: 'text-ink', border: 'border-ink/20' },
  Perda: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  ISO: { bg: 'bg-ink/10', text: 'text-ink', border: 'border-ink/20' },
  SNI: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
  GRI: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  TCFD: { bg: 'bg-sage/15', text: 'text-sage-dark', border: 'border-sage/30' },
  ISSB: { bg: 'bg-canvas', text: 'text-ink', border: 'border-border' },
  Lainnya: { bg: 'bg-canvas', text: 'text-muted', border: 'border-border' },
}

export default function RegulationList({ title, regulations, count, muted = false }: Props) {
  const [archiving, setArchiving] = useState<string | null>(null)
  const [previewRegId, setPreviewRegId] = useState<string | null>(null)
  const [confirmingArchiveId, setConfirmingArchiveId] = useState<string | null>(null)

  const pag = usePagination(regulations)

  const previewReg = previewRegId
    ? regulations.find((r) => r.id === previewRegId)
    : null

  const confirmingArchiveReg = confirmingArchiveId
    ? regulations.find((r) => r.id === confirmingArchiveId)
    : null

  async function handleArchive(id: string) {
    setArchiving(id)
    setConfirmingArchiveId(null)
    const result = await archiveRegulation(id)
    setArchiving(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Regulasi berhasil diarsipkan')
    }
  }

  async function handleConfirmEmbed(regulationId: string, editedChunks: EditableChunk[]) {
    const chunksToEmbed = editedChunks
      .filter((c) => !c.deleted && c.editedText.trim().length > 0)
      .map((c, i) => ({ index: i, text: c.editedText.trim() }))

    try {
      const res = await fetch('/api/admin/regulations/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regulationId, chunks: chunksToEmbed }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        toast.error(body?.error ?? 'Gagal meng-embed regulasi')
        return
      }
      toast.success('Regulasi berhasil di-embed ke basis pengetahuan')
    } catch {
      toast.error('Terjadi kesalahan saat meng-embed regulasi')
      return
    }

    setPreviewRegId(null)
    window.location.reload()
  }

  return (
    <>
      {previewReg && (
        <ChunkPreviewModal
          regulationId={previewReg.id}
          regulationTitle={previewReg.title}
          onClose={() => setPreviewRegId(null)}
          onConfirmEmbed={handleConfirmEmbed}
        />
      )}

      <ConfirmDialog
        isOpen={confirmingArchiveId !== null}
        onClose={() => setConfirmingArchiveId(null)}
        onConfirm={() => confirmingArchiveId && handleArchive(confirmingArchiveId)}
        loading={archiving !== null}
        title="Arsipkan Regulasi?"
        message={confirmingArchiveReg
          ? `Regulasi "${confirmingArchiveReg.title}" akan diarsipkan dan tidak lagi aktif digunakan.`
          : 'Regulasi ini akan diarsipkan dan tidak lagi aktif digunakan.'}
        confirmLabel="Ya, Arsipkan"
      />

      <div className={`bg-surface border border-border rounded-[18px] overflow-hidden shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)] ${muted ? 'opacity-65' : ''}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark">
              {title}
            </h3>
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted bg-canvas px-2 py-0.5 rounded-full">
              {count}
            </span>
          </div>
          {muted && (
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
              Read-only
            </span>
          )}
        </div>

        {/* List */}
        <ul className="divide-y divide-border">
          {pag.pageItems.map((reg) => {
            const cat = categoryColor[reg.category] ?? categoryColor.Lainnya
            return (
              <li key={reg.id} className="px-4 sm:px-6 py-4 hover:bg-canvas/40 transition-colors">
                <div className="flex items-start gap-3 sm:gap-4 flex-wrap">
                  {/* Icon tile */}
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-mint text-sage-dark flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" strokeWidth={1.8} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-ink truncate tracking-tight">{reg.title}</p>
                      <span className={`inline-flex items-center text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border flex-shrink-0 ${cat.bg} ${cat.text} ${cat.border}`}>
                        {reg.category}
                      </span>
                      {/* Embedded badge */}
                      {reg.is_embedded && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-sage text-white flex-shrink-0">
                          <Check className="w-2.5 h-2.5" strokeWidth={3} />
                          {reg.chunk_count} chunks
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap tabular-nums">
                      <span className="font-semibold text-ink">v{reg.version}</span>
                      {reg.file_name && (
                        <>
                          <span aria-hidden className="w-1 h-1 rounded-full bg-muted/40" />
                          <span className="truncate max-w-[200px]">{reg.file_name}</span>
                        </>
                      )}
                      {reg.file_size && (
                        <>
                          <span aria-hidden className="w-1 h-1 rounded-full bg-muted/40" />
                          <span>{formatBytes(reg.file_size)}</span>
                        </>
                      )}
                      <span aria-hidden className="w-1 h-1 rounded-full bg-muted/40" />
                      <span>
                        {new Date(reg.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {reg.is_embedded && reg.embedded_at && (
                        <>
                          <span aria-hidden className="w-1 h-1 rounded-full bg-sage" />
                          <span className="text-sage-dark font-medium">
                            embedded {new Date(reg.embedded_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </>
                      )}
                    </p>

                    {/* Already embedded notice */}
                    {reg.is_embedded && (
                      <p className="text-[11px] text-muted mt-2 flex items-center gap-1.5">
                        <Info className="w-3 h-3 text-muted flex-shrink-0" strokeWidth={2} />
                        Untuk embed ulang, arsipkan regulasi ini lalu upload versi baru.
                      </p>
                    )}
                  </div>

                  {/* Actions — active only */}
                  {reg.status === 'active' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
                      {/* Preview & Embed — only if not yet embedded */}
                      {reg.file_path && !reg.is_embedded && (
                        <button
                          onClick={() => setPreviewRegId(reg.id)}
                          className="group flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)]"
                          title="Preview chunks sebelum embed"
                        >
                          <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                          Preview & Embed
                        </button>
                      )}

                      {/* Archive */}
                      <button
                        onClick={() => setConfirmingArchiveId(reg.id)}
                        disabled={archiving === reg.id}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 border border-border text-muted hover:border-red-200 hover:text-red-600 hover:bg-red-50 text-xs font-semibold rounded-full transition-all disabled:opacity-50"
                        title="Arsipkan regulasi"
                      >
                        {archiving === reg.id ? (
                          <Loader2 className="animate-spin w-3 h-3" />
                        ) : (
                          <Archive className="w-3 h-3" strokeWidth={2} />
                        )}
                        Arsipkan
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {regulations.length > 0 && (
          <div className="px-6 py-3.5 border-t border-border">
            <Pagination {...pag} onPageChange={pag.goToPage} />
          </div>
        )}
      </div>
    </>
  )
}