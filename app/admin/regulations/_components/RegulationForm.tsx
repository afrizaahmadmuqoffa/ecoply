'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, Check, FileText, Loader2, Upload, X } from 'lucide-react'
import { createRegulation } from '@/lib/supabase/actions/admin'
import type { CreateRegulationInput } from '@/lib/validators/admin'

const CATEGORIES = ['OJK', 'KLHK', 'ESDM', 'Kemenaker', 'Kemenperin', 'UU/PP', 'Perda', 'ISO', 'SNI', 'GRI', 'TCFD', 'ISSB', 'Lainnya'] as const

export default function RegulationForm() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<CreateRegulationInput>({
    title: '',
    description: '',
    category: 'OJK',
    version: '1.0',
  })
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await createRegulation(form, file ?? undefined)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      toast.error(result.error)
    } else {
      setSuccess(true)
      toast.success('Regulasi berhasil disimpan')
      setForm({ title: '', description: '', category: 'OJK', version: '1.0' })
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
      {/* Header */}
      <h2 className="text-xl font-extrabold text-ink tracking-tight mb-1">
        Regulasi <span className="text-sage">Baru.</span>
      </h2>
      <p className="text-xs text-muted mb-5 leading-relaxed">
        Isi metadata lalu upload dokumen regulasi. Format yang didukung: PDF, Word, TXT.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Judul Dokumen <span className="text-sage-dark">*</span>
          </label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            placeholder="Contoh: POJK No. 51/2017 tentang Keuangan Berkelanjutan"
          />
        </div>

        {/* Category + Version */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="col-span-3">
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Kategori
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as typeof form.category }))}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Versi
            </label>
            <input
              type="text"
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all font-mono"
              placeholder="1.0"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Deskripsi <span className="text-muted font-normal normal-case tracking-normal">(opsional)</span>
          </label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all resize-none"
            placeholder="Ringkasan singkat isi regulasi..."
          />
        </div>

        {/* File dropzone */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            File Dokumen <span className="text-sage-dark">*</span>
          </label>
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
            className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
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
                    <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
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
                <span className="w-11 h-11 rounded-full bg-canvas flex items-center justify-center">
                  <Upload className="w-5 h-5 text-sage-dark" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Klik atau drag file ke sini</p>
                  <p className="text-xs text-muted mt-0.5">
                    PDF, DOC, DOCX, TXT · Maks. 50 MB
                  </p>
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-mint border border-sage/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <Check className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
            <p className="text-sm text-sage-dark font-medium">Regulasi berhasil disimpan</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="group w-full bg-sage hover:bg-sage-dark text-white py-3 rounded-full text-sm font-semibold tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Menyimpan...
            </>
          ) : (
            <>
              Simpan Regulasi
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>
    </div>
  )
}