'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { saveExtractionDrafts } from '@/lib/supabase/actions/carbon-extraction'
import type { ExtractedEntryInput } from '@/lib/supabase/actions/carbon-extraction'
import { AlertTriangle, ArrowRight, Check, CheckCircle2, FileText, RefreshCw, UploadCloud, X } from 'lucide-react'

type Stage = 'idle' | 'uploading' | 'extracting' | 'review' | 'saving' | 'done' | 'error'

const scopeLabel: Record<string, { label: string; color: string }> = {
  scope1_stationary:  { label: 'S1 Stationary',  color: 'bg-amber-50 text-amber-800 border-amber-200' },
  scope1_mobile_fuel: { label: 'S1 Mobile Fuel',  color: 'bg-amber-50 text-amber-800 border-amber-200' },
  scope1_vehicle:     { label: 'S1 Vehicle',      color: 'bg-amber-50 text-amber-800 border-amber-200' },
  scope1_fugitive:    { label: 'S1 Fugitive',     color: 'bg-amber-50 text-amber-800 border-amber-200' },
  scope2:             { label: 'S2 Energy',        color: 'bg-sky-50 text-sky-800 border-sky-200' },
  scope3c1:           { label: 'S3 Cat 1',         color: 'bg-purple-50 text-purple-800 border-purple-200' },
}

export default function ExtractionWorkflow({ onDone }: { onDone?: () => void }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [entries, setEntries] = useState<ExtractedEntryInput[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<{ saved: number; skipped: number; errors?: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setStage('uploading')
    setError(null)

    const formData = new FormData()
    formData.append('document', file)

    const stageTimer = setTimeout(() => setStage('extracting'), 1500)

    try {
      const res = await fetch('/api/carbon/extract', { method: 'POST', body: formData })
      clearTimeout(stageTimer)

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Extraction gagal')
        setStage('error')
        return
      }

      if (!data.entries || data.entries.length === 0) {
        setError('Tidak ada aktivitas emisi yang ditemukan dalam dokumen')
        setStage('error')
        return
      }

      setEntries(data.entries)
      setStage('review')
    } catch (err) {
      clearTimeout(stageTimer)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStage('error')
    }
  }

  function removeEntry(index: number) {
    setEntries(prev => prev.filter((_, i) => i !== index))
    if (entries.length <= 1) {
      setStage('idle')
      setEntries([])
    }
  }

  async function handleSaveAll() {
    if (entries.length === 0) return
    setStage('saving')
    setError(null)

    try {
      const result = await saveExtractionDrafts({ entries })

      if (result.error && result.saved === 0) {
        setError(result.error)
        toast.error(result.error)
        setStage('error')
        return
      }

      setSaveResult({
        saved: result.saved ?? 0,
        skipped: result.skipped ?? 0,
        errors: result.errors,
      })
      toast.success(`Berhasil menyimpan ${result.saved ?? 0} draft aktivitas`)
      setStage('done')
      setTimeout(() => {
        if (onDone) {
          router.refresh()
          onDone()
        } else {
          router.push('/company/carbon')
        }
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStage('error')
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isProcessing = ['uploading', 'extracting', 'saving'].includes(stage)

  return (
    <div>
      {/* Upload form */}
      {stage === 'idle' && (
        <form onSubmit={handleUpload} className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const dropped = e.dataTransfer.files?.[0]
              if (dropped) setFile(dropped)
            }}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              file
                ? 'border-sage/40 bg-mint/30'
                : dragOver
                  ? 'border-sage bg-sage/5'
                  : 'border-border hover:border-sage/50 hover:bg-canvas'
            }`}
          >
            {file ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-11 h-11 rounded-lg bg-mint text-sage-dark flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-semibold text-ink truncate">{file.name}</p>
                    <p className="text-xs text-muted">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="w-8 h-8 rounded-full hover:bg-red-50 text-muted hover:text-red-600 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <span className="w-14 h-14 rounded-full bg-canvas flex items-center justify-center">
                  <UploadCloud className="w-6 h-6 text-sage-dark" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Klik atau drag dokumen ke sini</p>
                  <p className="text-xs text-muted mt-0.5">PDF, Word, TXT · Maks. 50 MB</p>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setFile(f)
            }}
          />

          <button
            type="submit"
            disabled={!file}
            className="group w-full bg-sage hover:bg-sage-dark text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            Mulai Ekstraksi
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
          </button>
        </form>
      )}

      {/* Processing */}
      {isProcessing && (
        <div className="space-y-3 py-8 text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-canvas" />
            <div className="absolute inset-0 rounded-full border-4 border-sage border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-semibold text-ink">
            {stage === 'uploading' && 'Mengunggah dokumen...'}
            {stage === 'extracting' && 'AI mengekstrak data aktivitas emisi...'}
            {stage === 'saving' && 'Menyimpan draft ke database...'}
          </p>
          {stage === 'extracting' && (
            <p className="text-xs text-muted">Proses ini membutuhkan waktu 1-2 menit</p>
          )}
        </div>
      )}

      {/* Review */}
      {stage === 'review' && (
        <div className="space-y-4">
          <div className="bg-mint border border-sage/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <Check className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
            <div>
              <p className="text-sm text-sage-dark font-semibold">
                Berhasil mengekstrak {entries.length} aktivitas
              </p>
              <p className="text-xs text-sage-dark mt-0.5">Review dan edit sebelum simpan sebagai draft</p>
            </div>
          </div>

          <div className="space-y-2">
            {entries.map((entry, i) => {
              const s = scopeLabel[entry.scope] ?? { label: entry.scope, color: 'bg-canvas text-muted border-border' }
              return (
                <div key={i} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`inline-flex items-center text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${s.color}`}>
                          {s.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                          entry.ef_matched ? 'bg-mint text-sage-dark border-sage/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {entry.ef_matched ? <><Check className="w-3 h-3" /> Matched</> : <><AlertTriangle className="w-3 h-3" /> No match</>}
                        </span>
                        {typeof entry.confidence === 'number' && (
                          <span className="text-[10px] font-bold tracking-wider uppercase text-muted">
                            {(entry.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-ink tracking-tight">{entry.description}</p>
                      <p className="text-xs text-muted mt-1 tabular-nums">
                        {entry.quantity} {entry.unit} · {new Date(entry.period_end).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[11px] text-muted mt-0.5 font-mono">
                        EF: {entry.ef_suggestion}
                      </p>
                    </div>
                    <button
                      onClick={() => removeEntry(i)}
                      className="w-8 h-8 rounded-full hover:bg-red-50 text-muted hover:text-red-600 flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                      </button>
                  </div>

                  {entry.source_excerpt && (
                    <blockquote className="mt-3 text-xs text-ink leading-relaxed border-l-[3px] border-sage pl-4 bg-mint/20 py-2 pr-3 rounded-r-xl">
                      {entry.source_excerpt}
                    </blockquote>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setStage('idle'); setEntries([]); setFile(null) }}
              className="flex-1 border border-border hover:border-sage hover:text-sage-dark text-ink py-2.5 rounded-full text-sm font-semibold transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleSaveAll}
              disabled={entries.length === 0}
              className="group flex-1 bg-sage hover:bg-sage-dark text-white py-2.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              Simpan {entries.length} Draft
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && error && (
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div>
              <p className="text-sm text-red-700 font-semibold">Gagal</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => { setStage('idle'); setError(null) }}
            className="group w-full border border-border hover:border-sage hover:text-sage-dark text-ink py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
            Coba Lagi
          </button>
        </div>
      )}

      {/* Done */}
      {stage === 'done' && (
        <div className="bg-mint border border-sage/30 rounded-xl px-4 py-4">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
            <div>
              <p className="text-sm text-sage-dark font-semibold">
                {saveResult?.saved ?? 0} draft berhasil disimpan
              </p>
              {(saveResult?.skipped ?? 0) > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" /> {saveResult!.skipped} entry dilewati
                  </p>
                  {saveResult!.errors?.map((e, i) => (
                    <p key={i} className="text-xs text-red-700">{e}</p>
                  ))}
                </div>
              )}
              <p className="text-xs text-sage-dark mt-1.5">
                {onDone ? 'Menutup popup...' : 'Mengarahkan ke dashboard...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}