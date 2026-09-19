'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, Banknote, Check, Loader2, Package } from 'lucide-react'
import MasterTable from '../MasterTable'
import {
  createS3C2AverageFactor,
  deactivateS3C2AverageFactor,
  createS3C2SpendFactor,
  deactivateS3C2SpendFactor,
} from '@/lib/supabase/actions/carbon-master'

type AvgFactorRow = {
  id: string; material_name: string; unit: string; ef_kg_co2e: number
  source: string | null; year_reference: number | null; is_active: boolean
}

type SpendFactorRow = {
  id: string; sector_name: string; currency: string; ef_kg_co2e: number
  eeio_database: string | null; year_reference: number | null; is_active: boolean
}

type Props = {
  avgFactors: AvgFactorRow[]
  spendFactors: SpendFactorRow[]
}

type Mode = 'average' | 'spend'

const AVG_UNITS = ['kg', 'tonne', 'litre', 'unit', 'm³', 'MJ', 'kWh']
const CURRENCIES = ['IDR', 'USD', 'EUR', 'GBP'] as const

export default function S3C2Tab({ avgFactors, spendFactors }: Props) {
  const [mode, setMode] = useState<Mode>('average')

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-canvas border border-border p-1 rounded-full w-fit">
        {(['average', 'spend'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-5 py-2 text-sm rounded-full font-semibold transition-all ${
              mode === m
                ? 'bg-ink text-white shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            {m === 'average' ? (
              <span className="inline-flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Average Materials
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" /> Spend Based
              </span>
            )}
          </button>
        ))}
      </div>

      {mode === 'average' ? (
        <AverageSection rows={avgFactors} />
      ) : (
        <SpendSection rows={spendFactors} />
      )}
    </div>
  )
}

function AverageSection({ rows }: { rows: AvgFactorRow[] }) {
  const [form, setForm] = useState({
    material_name: '', unit: 'kg', ef_kg_co2e: '',
    source: '', year_reference: new Date().getFullYear().toString(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const s = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    const result = await createS3C2AverageFactor({
      material_name: form.material_name,
      unit: form.unit,
      ef_kg_co2e: parseFloat(form.ef_kg_co2e),
      source: form.source || undefined,
      year_reference: parseInt(form.year_reference) || undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else {
      toast.success('Faktor Scope 3 Cat 2 berhasil ditambahkan')
      setSuccess(true)
      setForm({ ...form, material_name: '', ef_kg_co2e: '' })
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
      <div className="lg:col-span-2 lg:sticky lg:top-6">
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <h3 className="text-lg font-extrabold text-ink tracking-tight mb-1">
            Capital <span className="text-sage">Goods.</span>
          </h3>
          <p className="text-xs text-muted mb-5 leading-relaxed">
            Cat 2 — Capital Goods / Average-Data.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Nama Material <span className="text-sage-dark">*</span>
              </label>
              <input required placeholder="e.g. Industrial Machinery" value={form.material_name} onChange={(e) => s('material_name', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Satuan</label>
              <select value={form.unit} onChange={(e) => s('unit', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all">
                {AVG_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5 block">
                kg CO₂e per {form.unit} <span className="text-sage-dark">*</span>
              </label>
              <input required type="text" inputMode="decimal" placeholder="e.g. 2.89" value={form.ef_kg_co2e} onChange={(e) => s('ef_kg_co2e', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

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

      <div className="lg:col-span-3">
        <MasterTable rows={rows} onDeactivate={deactivateS3C2AverageFactor}
          editTable="s3c2_average_factors" editTitle="Cat 2 Average Material Factor"
          editFields={[
            { key: 'material_name', label: 'Nama Material', type: 'text' },
            { key: 'unit', label: 'Satuan', type: 'text' },
            { key: 'ef_kg_co2e', label: 'kg CO₂e/unit', type: 'number' },
            { key: 'source', label: 'Sumber', type: 'text' },
            { key: 'year_reference', label: 'Tahun', type: 'number' },
          ]}
          columns={[
            { key: 'material_name', label: 'Material' },
            { key: 'unit', label: 'Satuan' },
            { key: 'ef_kg_co2e', label: 'kg CO₂e/unit', render: (r) => <span className="font-mono">{r.ef_kg_co2e}</span> },
            { key: 'source', label: 'Sumber', render: (r) => <span className="text-muted text-[11px]">{r.source ?? '—'}{r.year_reference ? ` · ${r.year_reference}` : ''}</span> },
          ]}
          emptyText="Belum ada faktor material Cat 2."
        />
      </div>
    </div>
  )
}

function SpendSection({ rows }: { rows: SpendFactorRow[] }) {
  const [form, setForm] = useState({
    sector_name: '', currency: 'IDR' as typeof CURRENCIES[number],
    ef_kg_co2e: '', eeio_database: '',
    year_reference: new Date().getFullYear().toString(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const s = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    const result = await createS3C2SpendFactor({
      sector_name: form.sector_name,
      currency: form.currency,
      ef_kg_co2e: parseFloat(form.ef_kg_co2e),
      eeio_database: form.eeio_database || undefined,
      year_reference: parseInt(form.year_reference) || undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else {
      toast.success('Faktor Scope 3 Cat 2 berhasil ditambahkan')
      setSuccess(true)
      setForm({ ...form, sector_name: '', ef_kg_co2e: '' })
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  const currencyUnits: Record<string, string> = { IDR: '1 IDR', USD: '1 USD', EUR: '1 EUR', GBP: '1 GBP' }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
      <div className="lg:col-span-2 lg:sticky lg:top-6">
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <h3 className="text-lg font-extrabold text-ink tracking-tight mb-1">
            Spend <span className="text-sage">EEIO.</span>
          </h3>
          <p className="text-xs text-muted mb-5 leading-relaxed">
            Cat 2 — Capital Goods / EEIO Spend-Based.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Nama Sektor <span className="text-sage-dark">*</span>
              </label>
              <input required placeholder="e.g. Machinery Manufacturing" value={form.sector_name} onChange={(e) => s('sector_name', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Mata Uang</label>
              <div className="flex gap-1 bg-canvas border border-border p-1 rounded-full">
                {CURRENCIES.map((c) => (
                  <button key={c} type="button" onClick={() => s('currency', c)}
                    className={`flex-1 py-1.5 text-xs rounded-full font-semibold transition-all ${form.currency === c ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink'}`}>{c}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5 block">
                kg CO₂e per {currencyUnits[form.currency]} <span className="text-sage-dark">*</span>
              </label>
              <input required type="text" inputMode="decimal" placeholder="e.g. 0.00000045" value={form.ef_kg_co2e} onChange={(e) => s('ef_kg_co2e', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ink mb-1">Database EEIO</label>
              <input placeholder="e.g. US EEIO 2.0" value={form.eeio_database} onChange={(e) => s('eeio_database', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-xs text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ink mb-1">Tahun</label>
              <input type="number" placeholder="2024" value={form.year_reference} onChange={(e) => s('year_reference', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-xs text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
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

      <div className="lg:col-span-3">
        <MasterTable rows={rows} onDeactivate={deactivateS3C2SpendFactor}
          editTable="s3c2_spend_factors" editTitle="Cat 2 Spend-Based Sector Factor"
          editFields={[
            { key: 'sector_name', label: 'Nama Sektor', type: 'text' },
            { key: 'currency', label: 'Mata Uang', type: 'select', options: ['IDR', 'USD', 'EUR', 'GBP'] },
            { key: 'ef_kg_co2e', label: 'kg CO₂e/unit currency', type: 'number' },
            { key: 'eeio_database', label: 'Database EEIO', type: 'text' },
            { key: 'year_reference', label: 'Tahun', type: 'number' },
          ]}
          columns={[
            { key: 'sector_name', label: 'Sektor Industri' },
            { key: 'currency', label: 'Mata Uang' },
            { key: 'ef_kg_co2e', label: 'kg CO₂e/unit', render: (r) => <span className="font-mono text-[11px]">{r.ef_kg_co2e}</span> },
            { key: 'eeio_database', label: 'Database', render: (r) => <span className="text-muted text-[11px]">{r.eeio_database ?? '—'}{r.year_reference ? ` · ${r.year_reference}` : ''}</span> },
          ]}
          emptyText="Belum ada faktor spend-based Cat 2."
        />
      </div>
    </div>
  )
}