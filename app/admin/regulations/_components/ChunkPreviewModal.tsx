'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  Undo2,
  WandSparkles,
  X,
  XCircle,
} from 'lucide-react'
import type { PreviewChunk, PreviewResponse } from '@/app/api/admin/regulations/preview/route'

type Props = {
  regulationId: string
  regulationTitle: string
  onClose: () => void
  onConfirmEmbed: (regulationId: string, chunks: EditableChunk[]) => Promise<void>
}

export type EditableChunk = PreviewChunk & {
  editedText: string
  deleted: boolean
  edited: boolean
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'embedding' | 'done'

const qualityConfig = {
  good: {
    label: 'Baik',
    color: 'text-sage-dark bg-mint border-sage/30',
    dot: 'bg-sage',
  },
  warn: {
    label: 'Perlu Cek',
    color: 'text-amber-800 bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
  },
  bad: {
    label: 'Noise',
    color: 'text-red-700 bg-red-50 border-red-200',
    dot: 'bg-red-500',
  },
}

export default function ChunkPreviewModal({
  regulationId,
  regulationTitle,
  onClose,
  onConfirmEmbed,
}: Props) {
  const [state, setState] = useState<LoadState>('idle')
  const [chunks, setChunks] = useState<EditableChunk[]>([])
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'good' | 'warn' | 'bad' | 'deleted'>('all')

  const selectedChunk = selectedIndex !== null ? chunks[selectedIndex] ?? null : null

  function handleTextChange(index: number, newText: string) {
    setChunks((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c
        const trimmed = newText.trim()
        return {
          ...c,
          editedText: newText,
          deleted: trimmed.length === 0,
          edited: trimmed !== c.text.trim(),
        }
      }),
    )
  }

  function handleDeleteToggle(index: number) {
    setChunks((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, deleted: !c.deleted } : c,
      ),
    )
  }

  async function loadPreview() {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/regulations/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regulationId }),
      })
      const data = await res.json() as PreviewResponse & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Preview gagal')
      setPreview(data)

      const editable: EditableChunk[] = data.chunks.map((c) => ({
        ...c,
        editedText: c.text,
        deleted: false,
        edited: false,
      }))
      setChunks(editable)
      setState('loaded')
      if (editable.length > 0) setSelectedIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
      setState('error')
    }
  }

  async function handleEmbed() {
    setState('embedding')
    await onConfirmEmbed(regulationId, chunks)
    setState('done')
  }

  const activeChunks = chunks.filter((c) => !c.deleted)
  const deletedCount = chunks.filter((c) => c.deleted).length
  const editedCount = chunks.filter((c) => c.edited && !c.deleted).length
  const goodCount = chunks.filter((c) => !c.deleted && c.quality === 'good').length
  const warnCount = chunks.filter((c) => !c.deleted && c.quality === 'warn').length
  const badCount = chunks.filter((c) => !c.deleted && c.quality === 'bad').length

  const filteredChunks = chunks
    .map((c, i) => ({ ...c, originalIndex: i }))
    .filter((c) => {
      if (filter === 'deleted') return c.deleted
      if (c.deleted) return false
      if (filter === 'all') return true
      return c.quality === filter
    })

  const statsCards = [
    { label: 'Akan di-Embed', value: activeChunks.length, accent: 'sage' as const },
    { label: 'Dibuang Otomatis', value: preview?.filteredOut ?? 0, accent: 'muted' as const },
    { label: 'Dihapus Manual', value: deletedCount, accent: 'red' as const },
    { label: 'Diedit', value: editedCount, accent: 'amber' as const },
  ]

  const statsAccent = {
    sage: { bg: 'bg-mint', text: 'text-sage-dark' },
    muted: { bg: 'bg-canvas', text: 'text-muted' },
    red: { bg: 'bg-red-50', text: 'text-red-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-800' },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-[22px] shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark mb-0.5">
              Preview & Edit Chunks
            </span>
            <h2 className="text-lg font-extrabold text-ink tracking-tight truncate">
              {regulationTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors flex-shrink-0 ml-4"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col px-6 py-5 min-h-0">

          {/* IDLE state */}
          {state === 'idle' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-[18px] bg-mint text-sage-dark flex items-center justify-center ring-8 ring-mint/40">
                <Sparkles className="w-8 h-8" strokeWidth={1.6} />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-ink tracking-tight mb-2">
                  Preview & Edit <span className="text-sage">Sebelum Embed.</span>
                </h3>
                <p className="text-sm text-muted leading-relaxed max-w-sm">
                  Lihat dan edit hasil chunking sebelum disimpan ke vector database.
                  Kosongkan teks chunk untuk menghapusnya otomatis.
                </p>
              </div>
              <button
                onClick={loadPreview}
                className="group inline-flex items-center gap-2 bg-sage hover:bg-sage-dark text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(85,158,123,0.4)]"
              >
                Mulai Analisis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* LOADING state */}
          {state === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-canvas" />
                <div className="absolute inset-0 w-14 h-14 rounded-full border-4 border-sage border-t-transparent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-ink">Mengekstrak & menganalisis teks...</p>
                <p className="text-xs text-muted mt-1">Proses ini biasanya memakan waktu 3-10 detik</p>
              </div>
            </div>
          )}

          {/* ERROR state */}
          {state === 'error' && (
            <div className="flex-1 flex items-center justify-center flex-col gap-4">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-700 flex items-center justify-center">
                <XCircle className="w-6 h-6" strokeWidth={1.8} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-ink mb-1">Gagal memuat preview</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
              <button
                onClick={loadPreview}
                className="text-xs font-semibold text-sage-dark hover:underline"
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* LOADED / EMBEDDING / DONE */}
          {(state === 'loaded' || state === 'embedding' || state === 'done') && preview && (
            <div className="flex-1 flex flex-col min-h-0 gap-3">

              {/* Stats cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {statsCards.map((s) => {
                  const a = statsAccent[s.accent]
                  return (
                    <div key={s.label} className={`${a.bg} rounded-xl px-3 py-2.5`}>
                      <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
                        {s.label}
                      </p>
                      <p className={`text-xl font-extrabold tracking-tight mt-0.5 ${a.text}`}>
                        {s.value}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Quality legend + filter tabs */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Kualitas:</span>
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="w-2 h-2 rounded-full bg-sage" />
                    {goodCount} baik
                  </span>
                  {warnCount > 0 && (
                    <span className="flex items-center gap-1.5 text-muted">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      {warnCount} perlu cek
                    </span>
                  )}
                  {badCount > 0 && (
                    <span className="flex items-center gap-1.5 text-muted">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {badCount} noise
                    </span>
                  )}
                </div>

                {/* Filter tabs */}
                <div className="flex gap-0.5 flex-wrap bg-canvas p-1 rounded-full border border-border w-fit">
                  {([
                    { key: 'all', label: 'Semua', count: chunks.filter((c) => !c.deleted).length },
                    { key: 'good', label: 'Baik', count: goodCount },
                    { key: 'warn', label: 'Perlu Cek', count: warnCount },
                    { key: 'bad', label: 'Noise', count: badCount },
                    { key: 'deleted', label: 'Dihapus', count: deletedCount },
                  ] as const).map(({ key, label, count }) =>
                    count > 0 || key === 'all' ? (
                      <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          filter === key
                            ? key === 'deleted'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-ink text-white shadow-sm'
                            : 'text-muted hover:text-ink'
                        }`}
                      >
                        {label}
                        <span className={`ml-1 text-[10px] ${filter === key ? 'opacity-80' : 'opacity-60'}`}>
                          {count}
                        </span>
                      </button>
                    ) : null
                  )}
                </div>
              </div>

              {/* Split view */}
              <div className="flex-1 flex gap-3 min-h-0">
                {/* Chunk list */}
                <div className="w-60 flex-shrink-0 flex flex-col border border-border rounded-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-border bg-canvas/40 flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
                      Daftar Chunk
                    </span>
                    <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
                      {filteredChunks.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {filteredChunks.length === 0 && (
                      <div className="p-4 text-center">
                        <p className="text-xs text-muted">Tidak ada chunk pada filter ini</p>
                      </div>
                    )}
                    {filteredChunks.map((chunk) => {
                      const q = qualityConfig[chunk.quality]
                      const isSelected = selectedIndex === chunk.originalIndex
                      const tokenEstimate = Math.ceil(chunk.editedText.length / 4)
                      return (
                        <button
                          key={chunk.originalIndex}
                          onClick={() => setSelectedIndex(chunk.originalIndex)}
                          className={`w-full text-left px-3 py-2.5 border-b border-border/60 transition-all ${
                            isSelected
                              ? 'bg-mint/40 border-l-[3px] border-l-sage'
                              : 'hover:bg-canvas/60 border-l-[3px] border-l-transparent'
                          } ${chunk.deleted ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${chunk.deleted ? 'bg-muted/50' : q.dot}`} />
                            <span className="text-[11px] font-bold text-ink">
                              #{chunk.originalIndex + 1}
                            </span>
                            {chunk.deleted && (
                              <span className="text-[9px] font-bold tracking-wider uppercase text-red-700 bg-red-50 px-1 py-0 rounded">
                                Dihapus
                              </span>
                            )}
                            {chunk.edited && !chunk.deleted && (
                              <span className="text-[9px] font-bold tracking-wider uppercase text-amber-800 bg-amber-50 px-1 py-0 rounded">
                                Diedit
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-muted ml-auto tabular-nums">
                              ~{tokenEstimate}t
                            </span>
                          </div>
                          <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
                            {chunk.editedText.slice(0, 90) || '(kosong — akan dihapus)'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Detail / Edit panel */}
                <div className="flex-1 flex flex-col min-h-0 border border-border rounded-xl overflow-hidden">
                  {selectedChunk ? (
                    <>
                      {/* Chunk toolbar */}
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-canvas/40 flex-shrink-0 flex-wrap">
                        <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-ink">
                          Chunk #{selectedIndex! + 1}
                        </span>
                        {!selectedChunk.deleted && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${qualityConfig[selectedChunk.quality].color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${qualityConfig[selectedChunk.quality].dot}`} />
                            {qualityConfig[selectedChunk.quality].label}
                          </span>
                        )}
                        {selectedChunk.edited && !selectedChunk.deleted && (
                          <span className="text-[10px] font-bold tracking-wider uppercase text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            <Pencil className="w-3 h-3" /> Diedit
                          </span>
                        )}
                        {selectedChunk.deleted && (
                          <span className="text-[10px] font-bold tracking-wider uppercase text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            <Trash2 className="w-3.5 h-3.5" /> Akan dihapus
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-muted ml-auto tabular-nums">
                          ~{Math.ceil(selectedChunk.editedText.length / 4)} token
                        </span>
                        <button
                          onClick={() => handleDeleteToggle(selectedIndex!)}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                            selectedChunk.deleted
                              ? 'bg-sage text-white hover:bg-sage-dark'
                              : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          {selectedChunk.deleted ? (
                            <>
                              <Undo2 className="w-3 h-3" strokeWidth={2.5} />
                              Pulihkan
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3" strokeWidth={2} />
                              Hapus
                            </>
                          )}
                        </button>
                      </div>

                      {/* Editable textarea */}
                      <div className="flex-1 flex flex-col p-4 min-h-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
                            Edit Teks Chunk
                          </p>
                          <p className="text-[10px] text-muted italic">
                            Kosongkan untuk menghapus otomatis
                          </p>
                        </div>
                        <textarea
                          value={selectedChunk.editedText}
                          onChange={(e) => handleTextChange(selectedIndex!, e.target.value)}
                          disabled={selectedChunk.deleted}
                          className={`flex-1 text-sm text-ink leading-relaxed font-sans border rounded-lg p-3 resize-none focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all ${
                            selectedChunk.deleted
                              ? 'bg-canvas/60 text-muted/70 cursor-not-allowed border-border'
                              : selectedChunk.editedText.trim() === ''
                                ? 'bg-red-50/50 border-red-300'
                                : 'bg-white border-border'
                          }`}
                          spellCheck={false}
                        />
                        {selectedChunk.editedText.trim() === '' && !selectedChunk.deleted && (
                          <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                            Teks kosong — chunk ini akan otomatis dihapus saat embed
                          </p>
                        )}
                        {selectedChunk.edited && !selectedChunk.deleted && selectedChunk.editedText.trim() !== '' && (
                          <button
                            onClick={() => handleTextChange(selectedIndex!, selectedChunk.text)}
                            className="text-xs text-muted hover:text-sage-dark mt-2 self-start flex items-center gap-1 font-medium"
                          >
                            <RefreshCw className="w-3 h-3" strokeWidth={2} />
                            Reset ke teks asli
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center mb-3">
                        <WandSparkles className="w-5 h-5 text-muted" strokeWidth={1.8} />
                      </div>
                      <p className="text-sm text-muted">Pilih chunk di sebelah kiri untuk melihat dan mengeditnya</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Success message */}
              {state === 'done' && (
                <div className="bg-mint border border-sage/30 rounded-xl px-4 py-3 flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-sage-dark flex-shrink-0" strokeWidth={2.5} />
                  <p className="text-sm text-sage-dark font-semibold">
                    Embedding selesai — {activeChunks.length} chunks tersimpan
                    {editedCount > 0 && `, ${editedCount} diedit manual`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border flex-shrink-0 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border bg-surface hover:border-sage hover:text-sage-dark text-ink text-sm font-semibold rounded-full transition-all"
          >
            {state === 'done' ? 'Tutup' : 'Batal'}
          </button>

          {state === 'loaded' && (
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted hidden sm:block">
                <span className="font-semibold text-ink">{activeChunks.length}</span> chunk akan di-embed
                {deletedCount > 0 && (
                  <span className="text-red-600"> · {deletedCount} dihapus</span>
                )}
              </p>
              <button
                onClick={handleEmbed}
                disabled={activeChunks.length === 0}
                className="group inline-flex items-center gap-2 bg-sage hover:bg-sage-dark text-white px-4 py-2 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                Konfirmasi & Embed
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-bold">
                  {activeChunks.length}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
              </button>
            </div>
          )}

          {state === 'embedding' && (
            <div className="flex items-center gap-3 text-sm text-muted">
              <Loader2 className="animate-spin w-4 h-4 text-sage" />
              <span>Menyimpan embeddings...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}