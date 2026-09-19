import type { Json } from '@/types/supabase'
import { Sparkles } from 'lucide-react'

type Props = {
  snapshot: Json | null
}

const SKIP_KEYS = ['extraction_meta']

export default function SnapshotBreakdown({ snapshot }: Props) {
  if (!snapshot || typeof snapshot !== 'object') {
    return (
      <div className="bg-canvas border border-border rounded-xl px-4 py-3">
        <p className="text-xs text-muted">Tidak ada detail kalkulasi</p>
      </div>
    )
  }

  const data = snapshot as Record<string, unknown>

  const rawMeta = data.extraction_meta
  const meta = (rawMeta && typeof rawMeta === 'object')
    ? rawMeta as Record<string, unknown>
    : null

  const formula = typeof data.formula === 'string' ? data.formula : null

  const entries = Object.entries(data)
    .filter(([key]) => !SKIP_KEYS.includes(key))
    .filter(([key, val]) => val !== null && val !== undefined && key !== 'formula')

  const metaDescription = meta && typeof meta.description === 'string' ? meta.description : null
  const metaEfSuggestion = meta && typeof meta.ef_suggestion === 'string' ? meta.ef_suggestion : null
  const metaConfidence = meta && typeof meta.confidence === 'number' ? meta.confidence : null
  const metaSourceExcerpt = meta && typeof meta.source_excerpt === 'string' ? meta.source_excerpt : null

  return (
    <div className="space-y-3">
      {/* Formula highlight */}
      {formula && (
        <div className="bg-mint border border-sage/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-md bg-sage text-white flex items-center justify-center">
              <Sparkles className="w-3 h-3" strokeWidth={2.5} />
            </span>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-sage-dark">Formula Kalkulasi</p>
          </div>
          <p className="text-sm font-mono text-sage-dark font-semibold">{formula}</p>
        </div>
      )}

      {/* Extraction meta (AI source) */}
      {meta && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center">
              <Sparkles className="w-3 h-3" strokeWidth={2} />
            </span>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-sky-700">Sumber Ekstraksi AI</p>
          </div>

          {metaDescription !== null && (
            <p className="text-xs text-sky-800 leading-relaxed">{metaDescription}</p>
          )}

          {metaEfSuggestion !== null && (
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full font-mono font-semibold">
                <Sparkles className="w-2.5 h-2.5" strokeWidth={3} />
                EF: {metaEfSuggestion}
              </span>
              {metaConfidence !== null && (
                <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full font-bold">
                  {(metaConfidence * 100).toFixed(0)}% confidence
                </span>
              )}
            </div>
          )}

          {metaSourceExcerpt !== null && (
            <blockquote className="text-xs text-sky-800 border-l-[3px] border-sky-400 pl-3 py-1 bg-sky-100/50 rounded-r-lg leading-relaxed">
              {metaSourceExcerpt}
            </blockquote>
          )}
        </div>
      )}

      {/* Detail snapshot */}
      {entries.length > 0 && (
        <div className="bg-canvas border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Detail Faktor Emisi</p>
          </div>
          <dl className="divide-y divide-border">
            {entries.map(([key, val]) => (
              <div key={key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-xs text-muted capitalize">{formatKey(key)}</dt>
                <dd className="text-xs font-mono font-semibold text-ink text-right tabular-nums">
                  {formatValue(val)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/ef /g, 'EF ')
    .replace(/gwp/g, 'GWP')
    .replace(/co2e/g, 'CO₂e')
    .replace(/co2/g, 'CO₂')
    .replace(/ch4/g, 'CH₄')
    .replace(/n2o/g, 'N₂O')
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak'
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return val.toLocaleString('id-ID')
    return val.toLocaleString('id-ID', { maximumFractionDigits: 4 })
  }
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}