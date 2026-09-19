'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, BarChart3, Check, Loader2 } from 'lucide-react'
import MasterTable from '../MasterTable'
import {
  createRecyclingFactor,
  deactivateRecyclingFactor,
} from '@/lib/supabase/actions/carbon-master'
import { CATEGORIES, MATERIAL_OPTIONS } from '@/lib/constants/marketplace'

type RecyclingRow = {
  id: string
  material_name: string
  category: string | null
  unit: string
  virgin_ef_kg_co2e: number
  recycled_ef_kg_co2e: number
  source: string | null
  year_reference: number | null
  is_active: boolean
}

type Props = {
  rows: RecyclingRow[]
}

const GENERIC_MATERIALS = ['Lainnya']

export default function RecyclingTab({ rows }: Props) {
  const [form, setForm] = useState({
    category: CATEGORIES[0],
    target: '__category__' as string,
    unit: 'kg' as 'kg' | 'tonne',
    virgin_ef_kg_co2e: '',
    recycled_ef_kg_co2e: '0', source: '',
    year_reference: new Date().getFullYear().toString(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const virginNum = parseFloat(form.virgin_ef_kg_co2e)
  const recycledNum = parseFloat(form.recycled_ef_kg_co2e)
  const netNum = isNaN(virginNum) ? null : virginNum - (isNaN(recycledNum) ? 0 : recycledNum)
  const unitLabel = form.unit === 'tonne' ? 'tonne' : 'kg'
  const efPerUnit = `kg CO₂e per ${unitLabel}`

  const categoryMaterials = (MATERIAL_OPTIONS[form.category] ?? []).filter(
    (m) => !GENERIC_MATERIALS.includes(m),
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    const result = await createRecyclingFactor({
      material_name: form.target === '__category__' ? form.category : form.target,
      category: form.target === '__category__' ? undefined : form.category,
      unit: form.unit,
      virgin_ef_kg_co2e: parseFloat(form.virgin_ef_kg_co2e),
      recycled_ef_kg_co2e: parseFloat(form.recycled_ef_kg_co2e) ?? 0,
      source: form.source || undefined,
      year_reference: parseInt(form.year_reference) || undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else {
      toast.success('Faktor daur ulang berhasil ditambahkan')
      setSuccess(true)
      setForm((f) => ({ ...f, virgin_ef_kg_co2e: '', recycled_ef_kg_co2e: '0' }))
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
      <div className="lg:col-span-2 lg:sticky lg:top-6">
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <h3 className="text-lg font-extrabold text-ink tracking-tight mb-1">
            Daur <span className="text-sage">Ulang.</span>
          </h3>
          <p className="text-xs text-muted mb-5 leading-relaxed">
            Avoided emissions = berat × (EF virgin − EF daur ulang).
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Kategori</label>
                <select
                  value={form.category}
                  onChange={(e) => {
                    const cat = e.target.value
                    setForm((f) => ({ ...f, category: cat, target: '__category__' }))
                  }}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-xs text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Material</label>
                <select
                  value={form.target}
                  onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-xs text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                >
                  <option value="__category__">
                    Semua {form.category}
                  </option>
                  {categoryMaterials.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Satuan</label>
              <select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as 'kg' | 'tonne' }))}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all">
                <option value="kg">kg</option>
                <option value="tonne">tonne</option>
              </select>
              <p className="text-[10px] text-muted mt-1.5 flex items-center gap-1.5">
                <span className="inline-block w-1 h-1 rounded-full bg-sage" />
                EF diisi per satuan ini; sertifikat ikut satuan listing
              </p>
            </div>

            <div className="bg-canvas rounded-xl p-4 border border-border space-y-3">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Emission Factors</p>
              <div>
                <label className="text-[10px] font-semibold text-ink mb-1 block">
                  EF Material Virgin ({efPerUnit}) <span className="text-sage-dark">*</span>
                </label>
                <input required type="text" inputMode="decimal" placeholder="e.g. 2.50" value={form.virgin_ef_kg_co2e}
                  onChange={(e) => setForm((f) => ({ ...f, virgin_ef_kg_co2e: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-ink mb-1 block">EF Daur Ulang / rPET ({efPerUnit})</label>
                <input type="text" inputMode="decimal" placeholder="e.g. 1.20" value={form.recycled_ef_kg_co2e}
                  onChange={(e) => setForm((f) => ({ ...f, recycled_ef_kg_co2e: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
              </div>
            </div>

            {/* Net EF live preview */}
            {netNum !== null && (
              <div className={`rounded-xl px-4 py-3 border ${netNum >= 0 ? 'bg-mint/30 border-sage/30' : 'bg-red-50 border-red-200'}`}>
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-1.5 flex items-center gap-1.5" style={{ color: netNum >= 0 ? '#3F8263' : '#B91C1C' }}>
                  <BarChart3 className="w-3 h-3" strokeWidth={2.5} />
                  Net EF (virgin − daur ulang)
                  Net EF (virgin − daur ulang)
                </p>
                <p className={`text-base font-extrabold tracking-tight font-mono ${netNum >= 0 ? 'text-sage-dark' : 'text-red-700'}`}>
                  {netNum.toFixed(4)} <span className="text-xs font-semibold">{efPerUnit}</span>
                </p>
                {netNum < 0 && (
                  <p className="text-[10px] text-red-700 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
                    Harus ≥ 0
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-ink mb-1">Sumber</label>
                <input placeholder="DEFRA 2024" value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-xs text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-ink mb-1">Tahun</label>
                <input type="number" placeholder="2024" value={form.year_reference}
                  onChange={(e) => setForm((f) => ({ ...f, year_reference: e.target.value }))}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-xs text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-mint border border-sage/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-sage-dark" strokeWidth={2.5} />
                <p className="text-xs text-sage-dark font-medium">Berhasil disimpan</p>
              </div>
            )}

            <button type="submit" disabled={loading || (netNum !== null && netNum < 0)}
              className="group w-full bg-sage hover:bg-sage-dark text-white py-2.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  Menyimpan...
                </>
              ) : (
                <>
                  Simpan
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-3">
        <MasterTable rows={rows} onDeactivate={deactivateRecyclingFactor}
          editTable="recycling_avoided_factors" editTitle="Recycling Avoided Factor"
          editFields={[
            { key: 'material_name', label: 'Nama Material', type: 'text' },
            { key: 'category', label: 'Kategori (scope)', type: 'select', options: CATEGORIES },
            { key: 'unit', label: 'Satuan', type: 'select', options: ['kg', 'tonne'] },
            { key: 'virgin_ef_kg_co2e', label: 'EF Virgin', type: 'number' },
            { key: 'recycled_ef_kg_co2e', label: 'EF Daur Ulang', type: 'number' },
            { key: 'source', label: 'Sumber', type: 'text' },
            { key: 'year_reference', label: 'Tahun', type: 'number' },
          ]}
          columns={[
            { key: 'material_name', label: 'Material' },
            { key: 'category', label: 'Kategori', render: (r) => <span className="text-muted text-[11px]">{r.category ?? 'Semua'}</span> },
            { key: 'unit', label: 'Satuan', render: (r) => <span>{r.unit === 'tonne' ? 'tonne' : 'kg'}</span> },
            { key: 'virgin_ef_kg_co2e', label: 'EF Virgin', render: (r) => <span className="font-mono">{r.virgin_ef_kg_co2e}</span> },
            { key: 'recycled_ef_kg_co2e', label: 'EF Daur Ulang', render: (r) => <span className="font-mono">{r.recycled_ef_kg_co2e}</span> },
            { key: 'net', label: 'Net', render: (r) => <span className="font-mono text-sage-dark font-semibold">{(r.virgin_ef_kg_co2e - r.recycled_ef_kg_co2e).toFixed(4)} kg CO₂e/{r.unit === 'tonne' ? 'tonne' : 'kg'}</span> },
            { key: 'source', label: 'Sumber', render: (r) => <span className="text-muted text-[11px]">{r.source ?? '—'}{r.year_reference ? ` · ${r.year_reference}` : ''}</span> },
          ]}
          emptyText="Belum ada faktor daur ulang. Tambahkan."
        />
      </div>
    </div>
  )
}