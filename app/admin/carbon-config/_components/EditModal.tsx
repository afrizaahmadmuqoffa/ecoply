'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, Check, Loader2, Pencil, X } from 'lucide-react'
import { updateCarbonMasterEntry } from '@/lib/supabase/actions/carbon-master'

export type FieldDef = {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'checkbox'
  options?: string[]
  step?: string
}

type Props = {
  table: string
  row: Record<string, unknown>
  fields: FieldDef[]
  title: string
  onClose: () => void
}

export default function EditModal({ table, row, fields, title, onClose }: Props) {
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {}
    for (const f of fields) {
      init[f.key] = row[f.key] ?? ''
    }
    return init
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const payload: Record<string, unknown> = {}
    for (const f of fields) {
      const v = form[f.key]
      if (f.type === 'number') {
        payload[f.key] = v === '' || v === null ? null : parseFloat(String(v))
      } else if (f.type === 'checkbox') {
        payload[f.key] = Boolean(v)
      } else {
        payload[f.key] = v === '' ? null : v
      }
    }

    const result = await updateCarbonMasterEntry(table, row.id as string, payload)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      toast.error(result.error)
    } else {
      setSuccess(true)
      toast.success('Data berhasil disimpan')
      setTimeout(() => { onClose() }, 1000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-[22px] shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)] w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-11 h-11 rounded-[14px] bg-mint text-sage-dark flex items-center justify-center flex-shrink-0 ring-4 ring-mint/40">
              <Pencil className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark mb-1">
                Edit Entry
              </span>
              <h2 className="text-lg font-extrabold text-ink tracking-tight truncate">
                {title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                {f.label}
              </label>

              {f.type === 'select' && f.options && (
                <select
                  value={String(form[f.key] ?? '')}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                >
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}

              {f.type === 'checkbox' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form[f.key])}
                    onChange={(e) => set(f.key, e.target.checked)}
                    className="w-4 h-4 rounded border-border text-sage focus:ring-sage"
                  />
                  <span className="text-sm text-ink font-medium">{form[f.key] ? 'Ya' : 'Tidak'}</span>
                </label>
              )}

              {f.type === 'number' && (
                <input
                  type="text"
                  inputMode="decimal"
                  value={String(form[f.key] ?? '')}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                />
              )}

              {f.type === 'text' && (
                <input
                  type="text"
                  value={String(form[f.key] ?? '')}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                />
              )}
            </div>
          ))}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-mint border border-sage/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
              <Check className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
              <p className="text-sm text-sage-dark font-medium">Berhasil disimpan</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-border bg-surface hover:border-sage hover:text-sage-dark text-ink text-sm font-semibold rounded-full transition-all"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={loading || success}
            className="group inline-flex items-center gap-2 bg-sage hover:bg-sage-dark text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                Menyimpan...
              </>
            ) : success ? (
              <>
                <Check className="w-4 h-4" strokeWidth={2.5} />
                Tersimpan
              </>
            ) : (
              <>
                Simpan Perubahan
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}