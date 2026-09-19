'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { saveExtractionDrafts } from '@/lib/supabase/actions/carbon-extraction'
import type { ExtractedEntryInput } from '@/lib/supabase/actions/carbon-extraction'
import { AlertTriangle, AlignLeft, ArrowRight, Check, CheckCircle2, RefreshCw, Sparkles, X } from 'lucide-react'

type Stage = 'idle' | 'parsing' | 'review' | 'saving' | 'done' | 'error'

const EXAMPLES = [
  'Bulan Januari 2026 kami pakai 500 liter Solar untuk genset dan 1200 liter Pertamax untuk armada kendaraan',
  'Listrik kantor Jakarta konsumsi 50.000 kWh selama Q1 2026',
  'AC chiller isi ulang 3kg R-410A bulan Maret 2026',
  'Pembelian 1000 kg baja dan 500 kg semen bulan Februari 2026',
]

const scopeLabel: Record<string, { label: string; color: string }> = {
  scope1_stationary:  { label: 'S1 Stationary',  color: 'bg-amber-50 text-amber-800 border-amber-200' },
  scope1_mobile_fuel: { label: 'S1 Mobile Fuel',  color: 'bg-amber-50 text-amber-800 border-amber-200' },
  scope1_vehicle:     { label: 'S1 Vehicle',      color: 'bg-amber-50 text-amber-800 border-amber-200' },
  scope1_fugitive:    { label: 'S1 Fugitive',     color: 'bg-amber-50 text-amber-800 border-amber-200' },
  scope2:             { label: 'S2 Energy',        color: 'bg-sky-50 text-sky-800 border-sky-200' },
  scope3c1:           { label: 'S3 Cat 1',         color: 'bg-purple-50 text-purple-800 border-purple-200' },
}

export default function PromptWorkflow({ onDone }: { onDone?: () => void }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [entries, setEntries] = useState<ExtractedEntryInput[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<{ saved: number; skipped: number; errors?: string[] } | null>(null)

  async function handleParse() {
    if (text.trim().length < 10) {
      setError('Teks terlalu pendek. Minimal 10 karakter.')
      return
    }

    setStage('parsing')
    setError(null)

    try {
      const res = await fetch('/api/carbon/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Parsing gagal')
        setStage('error')
        return
      }

      if (!data.entries || data.entries.length === 0) {
        setError('AI tidak menemukan aktivitas emisi dari teks yang diberikan. Coba tambahkan detail lebih spesifik.')
        setStage('error')
        return
      }

      setEntries(data.entries)
      setStage('review')
    } catch (err) {
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

  const isProcessing = ['parsing', 'saving'].includes(stage)

  return (
    <div>
      {/* Input */}
      {stage === 'idle' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Ceritakan aktivitas emisi perusahaan
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={6}
              placeholder="Contoh: Bulan Januari kami pakai 500 liter Solar untuk genset dan 1200 liter Pertamax untuk armada kendaraan..."
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 resize-none transition-all"
            />
            <p className="text-[11px] text-muted mt-1.5 flex items-center gap-1.5">
              <AlignLeft className="w-3 h-3" strokeWidth={2} />
              {text.length} karakter
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-2">
              💡 Contoh Input
            </p>
            <div className="space-y-1.5">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setText(ex)}
                  className="w-full text-left text-xs text-ink bg-canvas hover:bg-surface hover:border-sage/40 border border-border px-4 py-3 rounded-xl transition-all leading-relaxed group"
                >
                  <span className="group-hover:text-sage-dark transition-colors">{ex}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleParse}
            disabled={text.trim().length < 10}
            className="group w-full bg-sage hover:bg-sage-dark text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" strokeWidth={2} />
            Parse dengan AI
          </button>
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div className="space-y-4 py-10 text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-canvas" />
            <div className="absolute inset-0 rounded-full border-4 border-sage border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink tracking-tight">
              {stage === 'parsing' && 'AI memparse teks...'}
              {stage === 'saving' && 'Menyimpan draft ke database...'}
            </p>
            <p className="text-xs text-muted mt-1">Proses ini membutuhkan beberapa saat</p>
          </div>
        </div>
      )}

      {/* Review */}
      {stage === 'review' && (
        <div className="space-y-4">
          <div className="bg-mint border border-sage/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <Check className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
            <div>
              <p className="text-sm text-sage-dark font-semibold">
                Berhasil memparse {entries.length} aktivitas
              </p>
              <p className="text-xs text-sage-dark mt-0.5">Review dan edit sebelum simpan sebagai draft</p>
            </div>
          </div>

          {/* Original prompt context */}
          <div className="bg-canvas border border-border rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1.5">Input Asli</p>
            <p className="text-xs text-ink leading-relaxed">{text}</p>
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
                </div>
              )
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { setStage('idle'); setEntries([]) }}
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