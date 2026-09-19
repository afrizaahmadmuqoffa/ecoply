'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, Check, Factory, Loader2, Snowflake } from 'lucide-react'
import MasterTable from '../MasterTable'
import {
  createRefrigerantGwp,
  deactivateRefrigerantGwp,
  createFugitiveAssetCategory,
  deactivateFugitiveAssetCategory,
} from '@/lib/supabase/actions/carbon-master'

type RefrigerantRow = {
  id: string; refrigerant_name: string; gas_type: string; gwp_value: number
  source: string | null; is_active: boolean
}

type FugitiveAssetRow = {
  id: string; category_name: string; annual_leakage_rate: number
  typical_refrigerant: string | null; notes: string | null
  source: string | null; is_active: boolean
}

type Props = {
  refrigerants: RefrigerantRow[]
  fugitiveAssets: FugitiveAssetRow[]
}

type Mode = 'refrigerants' | 'assets'

const GAS_TYPES = ['HFC', 'PFC', 'SF6', 'NF3', 'HCFC', 'Other'] as const

export default function FugitiveTab({ refrigerants, fugitiveAssets }: Props) {
  const [mode, setMode] = useState<Mode>('refrigerants')

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-canvas border border-border p-1 rounded-full w-fit">
        {(['refrigerants', 'assets'] as const).map((m) => (
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
            {m === 'refrigerants' ? (
              <span className="inline-flex items-center gap-1.5">
                <Snowflake className="w-3.5 h-3.5" /> Refrigerants (GWP)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5" /> Fugitive Assets
              </span>
            )}
          </button>
        ))}
      </div>

      {mode === 'refrigerants' ? (
        <RefrigerantSection rows={refrigerants} />
      ) : (
        <FugitiveAssetSection rows={fugitiveAssets} />
      )}
    </div>
  )
}

function RefrigerantSection({ rows }: { rows: RefrigerantRow[] }) {
  const [form, setForm] = useState({
    refrigerant_name: '', gas_type: 'HFC' as typeof GAS_TYPES[number],
    gwp_value: '', source: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const s = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    const result = await createRefrigerantGwp({
      refrigerant_name: form.refrigerant_name,
      gas_type: form.gas_type,
      gwp_value: parseFloat(form.gwp_value),
      source: form.source || undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else {
      toast.success('Refrigeran berhasil ditambahkan')
      setSuccess(true)
      setForm({ ...form, refrigerant_name: '', gwp_value: '' })
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
      <div className="lg:col-span-2 lg:sticky lg:top-6">
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <h3 className="text-lg font-extrabold text-ink tracking-tight mb-1">
            GWP <span className="text-sage">Refrigeran.</span>
          </h3>
          <p className="text-xs text-muted mb-5 leading-relaxed">
            Nilai GWP 100 tahun (basis IPCC).
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Nama Refrigeran <span className="text-sage-dark">*</span>
              </label>
              <input required placeholder="e.g. R-410A" value={form.refrigerant_name} onChange={(e) => s('refrigerant_name', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Tipe Gas</label>
              <select value={form.gas_type} onChange={(e) => s('gas_type', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all">
                {GAS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5 block">
                GWP Value (100yr) <span className="text-sage-dark">*</span>
              </label>
              <input required type="text" inputMode="decimal" placeholder="e.g. 2088" value={form.gwp_value} onChange={(e) => s('gwp_value', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ink mb-1">Sumber</label>
              <input placeholder="e.g. IPCC AR5, DEFRA 2024" value={form.source} onChange={(e) => s('source', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-xs text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
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
        <MasterTable rows={rows} onDeactivate={deactivateRefrigerantGwp}
          editTable="refrigerant_gwp" editTitle="Refrigerant GWP"
          editFields={[
            { key: 'refrigerant_name', label: 'Nama Refrigeran', type: 'text' },
            { key: 'gas_type', label: 'Tipe Gas', type: 'select', options: ['HFC', 'PFC', 'SF6', 'NF3', 'HCFC', 'Other'] },
            { key: 'gwp_value', label: 'GWP Value (100yr)', type: 'number' },
            { key: 'source', label: 'Sumber', type: 'text' },
          ]}
          columns={[
            { key: 'refrigerant_name', label: 'Refrigeran' },
            { key: 'gas_type', label: 'Tipe Gas' },
            { key: 'gwp_value', label: 'GWP (100yr)', render: (r) => <span className="font-mono">{r.gwp_value.toLocaleString()}</span> },
            { key: 'source', label: 'Sumber', render: (r) => <span className="text-muted text-[11px]">{r.source ?? '—'}</span> },
          ]}
          emptyText="Belum ada refrigeran."
        />
      </div>
    </div>
  )
}

function FugitiveAssetSection({ rows }: { rows: FugitiveAssetRow[] }) {
  const [form, setForm] = useState({
    category_name: '', annual_leakage_rate: '',
    typical_refrigerant: '', notes: '', source: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const s = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    const rate = parseFloat(form.annual_leakage_rate)
    const result = await createFugitiveAssetCategory({
      category_name: form.category_name,
      annual_leakage_rate: rate > 1 ? rate / 100 : rate,
      typical_refrigerant: form.typical_refrigerant || undefined,
      notes: form.notes || undefined,
      source: form.source || undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else {
      toast.success('Kategori aset fugitif berhasil ditambahkan')
      setSuccess(true)
      setForm({ category_name: '', annual_leakage_rate: '', typical_refrigerant: '', notes: '', source: '' })
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
      <div className="lg:col-span-2 lg:sticky lg:top-6">
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <h3 className="text-lg font-extrabold text-ink tracking-tight mb-1">
            Kategori <span className="text-sage">Aset.</span>
          </h3>
          <p className="text-xs text-muted mb-5 leading-relaxed">
            Untuk metode Screening — tingkat kebocoran tahunan per kategori alat.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Nama Kategori <span className="text-sage-dark">*</span>
              </label>
              <input required placeholder="e.g. Small split AC, <5 kg" value={form.category_name} onChange={(e) => s('category_name', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5 block">
                Annual Leakage Rate <span className="text-sage-dark">*</span>
              </label>
              <div className="relative">
                <input required type="text" inputMode="decimal" placeholder="e.g. 5 (untuk 5%)" value={form.annual_leakage_rate} onChange={(e) => s('annual_leakage_rate', e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">%</span>
              </div>
              <p className="text-[10px] text-muted mt-1.5 flex items-center gap-1.5">
                <span className="inline-block w-1 h-1 rounded-full bg-sage" />
                Input sebagai persen (5) atau desimal (0.05)
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ink mb-1">Refrigeran Umum</label>
              <input placeholder="e.g. R-32, R-410A" value={form.typical_refrigerant} onChange={(e) => s('typical_refrigerant', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-xs text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ink mb-1">Catatan</label>
              <textarea rows={2} placeholder="Catatan tambahan..." value={form.notes} onChange={(e) => s('notes', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-xs text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 resize-none transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ink mb-1">Sumber</label>
              <input placeholder="e.g. IPCC 2006, DEFRA" value={form.source} onChange={(e) => s('source', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-xs text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
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
        <MasterTable rows={rows} onDeactivate={deactivateFugitiveAssetCategory}
          editTable="fugitive_asset_categories" editTitle="Fugitive Asset Category"
          editFields={[
            { key: 'category_name', label: 'Nama Kategori', type: 'text' },
            { key: 'annual_leakage_rate', label: 'Leakage Rate (fraction)', type: 'number' },
            { key: 'typical_refrigerant', label: 'Refrigeran Umum', type: 'text' },
            { key: 'notes', label: 'Catatan', type: 'text' },
            { key: 'source', label: 'Sumber', type: 'text' },
          ]}
          columns={[
            { key: 'category_name', label: 'Kategori Aset' },
            { key: 'annual_leakage_rate', label: 'Leakage Rate', render: (r) => <span className="font-mono">{(r.annual_leakage_rate * 100).toFixed(2)}%</span> },
            { key: 'typical_refrigerant', label: 'Refrigeran Umum', render: (r) => <span className="text-muted text-[11px]">{r.typical_refrigerant ?? '—'}</span> },
            { key: 'source', label: 'Sumber', render: (r) => <span className="text-muted text-[11px]">{r.source ?? '—'}</span> },
          ]}
          emptyText="Belum ada kategori aset."
        />
      </div>
    </div>
  )
}