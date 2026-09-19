'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitAuditJob } from '@/lib/supabase/actions/compliance'
import { AlertTriangle, ArrowRight, Check, FileText, History, Loader2, RefreshCw, UploadCloud, X } from 'lucide-react'

type Stage = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'done' | 'error'

type DuplicateInfo = {
  jobId: string
  documentName: string
  completedAt: string | null
}

const STAGES: { key: Stage; label: string; pct: number }[] = [
  { key: 'uploading',  label: 'Mengunggah dokumen...',       pct: 20 },
  { key: 'extracting', label: 'Membaca teks dokumen...',      pct: 45 },
  { key: 'analyzing',  label: 'AI menganalisis dokumen...',   pct: 85 },
  { key: 'done',       label: 'Laporan audit selesai!',       pct: 100 },
]

function formatDate(iso: string | null) {
  if (!iso) return 'sebelumnya'
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch {
    return 'sebelumnya'
  }
}

export default function AuditUploadForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null)

  const currentStage = STAGES.find((s) => s.key === stage)
  const progress = currentStage?.pct ?? 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    await runAudit(false)
  }

  async function runAudit(forceRerun: boolean) {
    if (!file) return

    setErrorMsg(null)
    setDuplicate(null)
    setStage('uploading')

    const formData = new FormData()
    formData.append('document', file)

    const stageTimer = setTimeout(() => setStage('extracting'), 2000)
    const stageTimer2 = setTimeout(() => setStage('analyzing'), 5000)

    const result = await submitAuditJob(formData, { forceRerun })

    clearTimeout(stageTimer)
    clearTimeout(stageTimer2)

    if (result.error) {
      setErrorMsg(result.error)
      toast.error(result.error)
      setStage('error')
    } else if (result.duplicate) {
      setDuplicate(result.duplicate)
      setStage('idle')
    } else if (result.jobId) {
      // Same file is already being processed/queued — navigate immediately
      // instead of showing the "done" banner which would be misleading.
      toast.success('Audit dimulai')
      router.push(`/company/compliance/${result.jobId}`)
    } else {
      setStage('done')
      toast.success('Audit berhasil dibuat')
      setTimeout(() => {
        router.push('/company/compliance')
      }, 1500)
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isProcessing = ['uploading', 'extracting', 'analyzing'].includes(stage)

  return (
    <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
      <h2 className="text-lg font-extrabold text-ink tracking-tight mb-1">
        Upload <span className="text-sage">Dokumen.</span>
      </h2>
      <p className="text-xs text-muted mb-5 leading-relaxed">
        Laporan keberlanjutan, laporan ESG, atau dokumen terkait.
        <br />
        Format: PDF, Word, TXT · Maks. 50 MB
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drop zone */}
        {!isProcessing && stage !== 'done' && (
          <div
            onClick={() => !isProcessing && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const dropped = e.dataTransfer.files?.[0]
              if (dropped) { setFile(dropped); setStage('idle') }
            }}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
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
                  <span className="w-10 h-10 rounded-lg bg-mint text-sage-dark flex items-center justify-center flex-shrink-0">
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
                <span className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 text-sage-dark" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Klik atau drag dokumen ke sini</p>
                  <p className="text-xs text-muted mt-0.5">PDF, Word, atau TXT</p>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) { setFile(f); setDuplicate(null); setStage('idle') }
          }}
        />

        {/* Duplicate / re-audit warning */}
        {duplicate && stage === 'idle' && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
              <History className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <div>
                <p className="text-sm text-amber-900 font-semibold">
                  Dokumen ini sudah pernah diaudit
                </p>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  &quot;{duplicate.documentName}&quot; sudah di-audit pada {formatDate(duplicate.completedAt)}.
                  <br />
                  Pilih untuk melihat hasil sebelumnya, atau jalankan audit ulang (menghabiskan kuota AI).
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push(`/company/compliance/${duplicate.jobId}`)}
                className="flex-1 bg-sage hover:bg-sage-dark text-white py-2 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" strokeWidth={2.5} />
                Lihat Hasil Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => runAudit(true)}
                className="flex-1 border border-border hover:border-sage hover:text-sage-dark text-ink py-2 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" strokeWidth={2} />
                Audit Ulang
              </button>
            </div>
          </div>
        )}

        {/* Progress section */}
        {isProcessing && (
          <div className="bg-canvas rounded-xl p-5 border border-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint text-sage-dark flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink tracking-tight">
                  {currentStage?.label}
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  Jangan tutup halaman ini
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
              <div
                className="bg-sage h-2 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Stage list */}
            <div className="space-y-2">
              {STAGES.filter(s => s.key !== 'done').map((s) => {
                const isDone = STAGES.findIndex(x => x.key === stage) > STAGES.findIndex(x => x.key === s.key)
                const isCurrent = s.key === stage
                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-2.5 text-xs transition-colors ${
                      isDone ? 'text-sage-dark' : isCurrent ? 'text-ink font-semibold' : 'text-muted/60'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isDone ? 'bg-sage text-white' : isCurrent ? 'bg-sage/20 text-sage-dark' : 'bg-canvas border border-border text-muted/40'
                    }`}>
                      {isDone ? (
                        <Check className="w-3 h-3" strokeWidth={3} />
                      ) : isCurrent ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-sage-dark" />
                      ) : (
                        <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                      )}
                    </span>
                    <span>{s.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Done state */}
        {stage === 'done' && (
          <div className="bg-mint border border-sage/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <Check className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
            <div>
              <p className="text-sm text-sage-dark font-semibold">Audit selesai</p>
              <p className="text-xs text-sage-dark mt-0.5">Mengarahkan ke laporan...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {stage === 'error' && errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <div>
              <p className="text-sm text-red-700 font-semibold">Audit gagal</p>
              <p className="text-xs text-red-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Submit button */}
        {!isProcessing && stage !== 'done' && (
          <button
            type="submit"
            disabled={!file || isProcessing}
            className="group w-full bg-sage hover:bg-sage-dark text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            Mulai Audit
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
          </button>
        )}

        {/* Retry button on error */}
        {stage === 'error' && (
          <button
            type="button"
            onClick={() => setStage('idle')}
            className="group w-full border border-border hover:border-sage hover:text-sage-dark text-ink py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
            Coba Lagi
          </button>
        )}
      </form>

      {/* Info */}
      {stage === 'idle' && (
        <div className="mt-5 pt-5 border-t border-border">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted mb-3">
            Cara Kerja
          </p>
          <div className="space-y-2.5">
            {[
              'Dokumen dianalisis terhadap regulasi ESG Indonesia',
              'Laporan berisi status kepatuhan, temuan, dan rekomendasi',
              'Proses biasanya selesai dalam 1–2 menit',
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-mint text-sage-dark flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold">{i + 1}</span>
                </span>
                <p className="text-xs text-muted leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}