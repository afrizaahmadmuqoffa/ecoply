'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { deleteAuditJob } from '@/lib/supabase/actions/compliance'
import { friendlyGeminiError } from '@/lib/gemini/errors'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Pagination from '@/components/ui/Pagination'
import usePagination from '@/lib/hooks/usePagination'
import { AlertTriangle, ArrowRight, Check, Clock, FileText, Loader2, Trash2, X } from 'lucide-react'

type Job = {
  id: string
  document_name: string
  file_size: number | null
  status: 'queued' | 'processing' | 'done' | 'failed'
  error_message: string | null
  created_at: string
  completed_at: string | null
}

const statusConfig = {
  queued: {
    label: 'Antrian',
    classes: 'text-amber-800 bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    icon: (
      <Clock className="w-3.5 h-3.5" strokeWidth={2} />
    ),
  },
  processing: {
    label: 'Diproses',
    classes: 'text-sky-800 bg-sky-50 border-sky-200',
    iconBg: 'bg-sky-100 text-sky-700',
    icon: (
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
    ),
  },
  done: {
    label: 'Selesai',
    classes: 'text-sage-dark bg-mint border-sage/30',
    iconBg: 'bg-sage text-white',
    icon: (
      <Check className="w-3 h-3" strokeWidth={3} />
    ),
  },
  failed: {
    label: 'Gagal',
    classes: 'text-red-700 bg-red-50 border-red-200',
    iconBg: 'bg-red-100 text-red-700',
    icon: (
      <X className="w-3 h-3" strokeWidth={3} />
    ),
  },
}

function formatSize(bytes: number | null) {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AuditJobList({ jobs }: { jobs: Job[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pag = usePagination(jobs)

  async function handleDelete(jobId: string) {
    setDeletingId(jobId)
    setError(null)
    const result = await deleteAuditJob(jobId)
    setDeletingId(null)
    setConfirmingId(null)
    if (result.error) {
      toast.error(result.error)
      setError(result.error)
    } else {
      toast.success('Audit berhasil dihapus')
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[18px] p-12 text-center shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
        <div className="w-14 h-14 rounded-full bg-canvas flex items-center justify-center mx-auto mb-4">
          <FileText className="w-6 h-6 text-muted" strokeWidth={1.8} />
        </div>
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-1">
          Belum Ada Audit
        </p>
        <p className="text-sm text-muted">Upload dokumen di sebelah kiri untuk memulai audit pertama Anda.</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-[18px] overflow-hidden shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
      <div className="px-6 py-4 border-b border-border bg-canvas/40 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
          Riwayat Audit
        </span>
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
          {jobs.length} entries
        </span>
      </div>

      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <ul className="divide-y divide-border">
        {pag.pageItems.map((job) => {
          const s = statusConfig[job.status]
          const canDelete = job.status === 'done' || job.status === 'failed'
          const isDeleting = deletingId === job.id

          return (
            <li key={job.id} className="px-6 py-4 hover:bg-canvas/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                    {s.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-ink truncate tracking-tight">
                        {job.document_name}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${s.classes}`}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap tabular-nums">
                      <span>
                        {formatDate(job.created_at)}
                      </span>
                      {job.file_size && (
                        <>
                          <span aria-hidden className="w-1 h-1 rounded-full bg-muted/40" />
                          <span>{formatSize(job.file_size)}</span>
                        </>
                      )}
                    </p>
                    {job.status === 'failed' && job.error_message && (
                      <div className="mt-2 bg-red-50/60 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
                        <p className="text-[11px] text-red-700 leading-relaxed">
                          {friendlyGeminiError(new Error(job.error_message), { fallback: job.error_message })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {job.status === 'done' && (
                    <Link
                      href={`/company/compliance/${job.id}`}
                      className="group inline-flex items-center gap-1 px-3 py-1.5 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)]"
                    >
                      Lihat
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                    </Link>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setConfirmingId(job.id)}
                      disabled={isDeleting}
                      className="w-8 h-8 rounded-full hover:bg-red-50 text-muted hover:text-red-600 flex items-center justify-center transition-colors disabled:opacity-50"
                      title="Hapus audit ini"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="px-6 py-3.5 border-t border-border">
        <Pagination {...pag} onPageChange={pag.goToPage} />
      </div>
      </div>

      <ConfirmDialog
        isOpen={confirmingId !== null}
        onClose={() => setConfirmingId(null)}
        onConfirm={() => confirmingId && handleDelete(confirmingId)}
        loading={deletingId !== null}
        title="Hapus Audit?"
        message="Seluruh laporan, item tindak lanjut, dan dokumen audit ini akan dihapus permanen."
        confirmLabel="Ya, Hapus"
      />
    </>
  )
}