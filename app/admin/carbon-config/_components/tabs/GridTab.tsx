'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, Check, CloudFog, Loader2, Zap } from 'lucide-react'
import MasterTable from '../MasterTable'
import { createGridFactor, deactivateGridFactor } from '@/lib/supabase/actions/carbon-master'

type Row = {
  id: string; region_name: string; energy_type: string; unit: string
  ef_kg_co2e: number; method: string | null; country: string | null
  source: string | null; year_reference: number | null; is_active: boolean
}

export default function GridTab({ rows }: { rows: Row[] }) {
  const [form, setForm] = useState({
    region_name: '', energy_type: 'electricity' as 'electricity' | 'steam',
    unit: 'kWh' as 'kWh' | 'MWh' | 'MMBtu', ef_kg_co2e: '',
    method: 'location_based' as 'location_based' | 'market_based',
    country: 'ID', source: '', year_reference: new Date().getFullYear().toString(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const s = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm((f) => ({ ...f, [k]: v }))

  function handleEnergyType(t: 'electricity' | 'steam') {
    s('energy_type', t)
    s('unit', t === 'steam' ? 'MMBtu' : 'kWh')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    const result = await createGridFactor({
      region_name: form.region_name, energy_type: form.energy_type,
      unit: form.unit, ef_kg_co2e: parseFloat(form.ef_kg_co2e),
      method: form.method, country: form.country || 'ID',
      source: form.source || undefined, year_reference: parseInt(form.year_reference) || undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else { toast.success('Faktor grid berhasil ditambahkan'); setSuccess(true); setForm({ ...form, region_name: '', ef_kg_co2e: '' }); setTimeout(() => setSuccess(false), 3000) }
  }

  const electricity = rows.filter((r) => r.energy_type === 'electricity')
  const steam = rows.filter((r) => r.energy_type === 'steam')

  const cols = [
    { key: 'region_name', label: 'Wilayah / Region' },
    { key: 'unit', label: 'Satuan' },
    { key: 'ef_kg_co2e', label: 'kg CO₂e/unit', render: (r: Row) => <span className="font-mono">{r.ef_kg_co2e}</span> },
    { key: 'method', label: 'Metode', render: (r: Row) => <span className="text-muted text-[11px] capitalize">{r.method?.replace('_', ' ') ?? '—'}</span> },
    { key: 'source', label: 'Sumber', render: (r: Row) => <span className="text-muted text-[11px]">{r.source ?? '—'}{r.year_reference ? ` · ${r.year_reference}` : ''}</span> },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
      <div className="lg:col-span-2 lg:sticky lg:top-6">
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <h3 className="text-lg font-extrabold text-ink tracking-tight mb-1">
            Grid <span className="text-sage">Energy.</span>
          </h3>
          <p className="text-xs text-muted mb-5 leading-relaxed">
            Faktor emisi listrik (kWh/MWh) atau steam (MMBtu).
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Energy type toggle */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Tipe Energi</label>
              <div className="flex gap-1 bg-canvas border border-border p-1 rounded-full">
                {(['electricity', 'steam'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => handleEnergyType(t)}
                    className={`flex-1 py-2 text-xs rounded-full font-semibold transition-all ${form.energy_type === t ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink'}`}>
                    {t === 'electricity' ? (
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> Listrik
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <CloudFog className="w-3.5 h-3.5" /> Steam
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Wilayah <span className="text-sage-dark">*</span>
              </label>
              <input required placeholder={form.energy_type === 'electricity' ? 'e.g. Jawa-Madura-Bali' : 'Global'}
                value={form.region_name} onChange={(e) => s('region_name', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

            {form.energy_type === 'electricity' && (
              <div>
                <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Satuan</label>
                <div className="flex gap-1 bg-canvas border border-border p-1 rounded-full">
                  {(['kWh', 'MWh'] as const).map((u) => (
                    <button key={u} type="button" onClick={() => s('unit', u)}
                      className={`flex-1 py-1.5 text-xs rounded-full font-semibold transition-all ${form.unit === u ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink'}`}>{u}</button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5 block">
                kg CO₂e per {form.unit} <span className="text-sage-dark">*</span>
              </label>
              <input required type="text" inputMode="decimal" placeholder="e.g. 0.7893" value={form.ef_kg_co2e} onChange={(e) => s('ef_kg_co2e', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

            {form.energy_type === 'electricity' && (
              <div>
                <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Metode</label>
                <div className="flex gap-1 bg-canvas border border-border p-1 rounded-full">
                  {(['location_based', 'market_based'] as const).map((m) => (
                    <button key={m} type="button" onClick={() => s('method', m)}
                      className={`flex-1 py-1.5 text-xs rounded-full font-semibold transition-all ${form.method === m ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink'}`}>
                      {m === 'location_based' ? 'Location' : 'Market'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-ink mb-1">Sumber</label>
                <input placeholder="DEFRA 2024" value={form.source} onChange={(e) => s('source', e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-xs text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-ink mb-1">Tahun</label>
                <input type="number" placeholder="2024" value={form.year_reference} onChange={(e) => s('year_reference', e.target.value)}
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

            <button type="submit" disabled={loading}
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

      <div className="lg:col-span-3 space-y-5">
        {electricity.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] uppercase text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" /> Listrik
              </span>
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">{electricity.length}</span>
            </div>
            <MasterTable rows={electricity} onDeactivate={deactivateGridFactor} columns={cols}
              editTable="grid_emission_factors" editTitle="Grid Emission Factor"
              editFields={[
                { key: 'region_name', label: 'Wilayah', type: 'text' },
                { key: 'energy_type', label: 'Tipe Energi', type: 'select', options: ['electricity', 'steam'] },
                { key: 'unit', label: 'Satuan', type: 'select', options: ['kWh', 'MWh', 'MMBtu'] },
                { key: 'ef_kg_co2e', label: 'kg CO₂e/unit', type: 'number' },
                { key: 'method', label: 'Metode', type: 'select', options: ['location_based', 'market_based'] },
                { key: 'source', label: 'Sumber', type: 'text' },
                { key: 'year_reference', label: 'Tahun', type: 'number' },
              ]} />
          </div>
        )}
        {steam.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] uppercase text-muted bg-canvas border border-border px-2 py-0.5 rounded-full">
                <CloudFog className="w-3 h-3" /> Steam
              </span>
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">{steam.length}</span>
            </div>
            <MasterTable rows={steam} onDeactivate={deactivateGridFactor} columns={cols}
              editTable="grid_emission_factors" editTitle="Grid Emission Factor"
              editFields={[
                { key: 'region_name', label: 'Wilayah / Sumber', type: 'text' },
                { key: 'energy_type', label: 'Tipe Energi', type: 'select', options: ['electricity', 'steam'] },
                { key: 'unit', label: 'Satuan', type: 'select', options: ['kWh', 'MWh', 'MMBtu'] },
                { key: 'ef_kg_co2e', label: 'kg CO₂e/unit', type: 'number' },
                { key: 'source', label: 'Sumber', type: 'text' },
                { key: 'year_reference', label: 'Tahun', type: 'number' },
              ]} />
          </div>
        )}
        {rows.length === 0 && (
          <div className="bg-surface border border-border rounded-[18px] p-12 text-center shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
            <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center mx-auto mb-3">
              <Zap className="w-5 h-5 text-muted" strokeWidth={1.8} />
            </div>
            <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Tidak Ada Data</p>
            <p className="text-sm text-muted">Belum ada faktor grid/energi</p>
          </div>
        )}
      </div>
    </div>
  )
}