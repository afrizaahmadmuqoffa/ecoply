'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateFugitive } from '@/lib/supabase/actions/carbon-activity'
import SingleMonthPicker, { type MonthRange } from './SingleMonthPicker'
import { AlertTriangle, BadgeCheck, Check, ClipboardList, Loader2, Sun, Wrench } from 'lucide-react'

type Refrigerant = { id: string; refrigerant_name: string; gwp_value: number; gas_type: string }
type AssetCategory = { id: string; category_name: string; annual_leakage_rate: number; typical_refrigerant: string | null }

type Props = {
  id: string
  refrigerants: Refrigerant[]
  assetCategories: AssetCategory[]
  initial: {
    method: 'top_up' | 'screening'
    refrigerant_name: string
    refrigerant_gwp_id: string | null
    gwp_value: number
    mass_refilled_kg: number | null
    asset_category_id: string | null
    asset_category_name: string | null
    total_capacity_kg: number | null
    leakage_rate: number | null
    period_start: string
    period_end: string
    notes: string | null
  }
  onSaved?: () => void
}

export default function EditFugitiveForm({ id, refrigerants, assetCategories, initial, onSaved }: Props) {
  const router = useRouter()
  const [method, setMethod] = useState<'top_up' | 'screening'>(initial.method)
  const [refrigerantId, setRefrigerantId] = useState(initial.refrigerant_gwp_id ?? '')
  const [gwpOverride, setGwpOverride] = useState(String(initial.gwp_value))
  const [massRefilled, setMassRefilled] = useState(String(initial.mass_refilled_kg ?? ''))
  const [assetCategoryId, setAssetCategoryId] = useState(initial.asset_category_id ?? '')
  const [totalCapacity, setTotalCapacity] = useState(String(initial.total_capacity_kg ?? ''))
  const [leakageRatePct, setLeakageRatePct] = useState(
    initial.leakage_rate ? String((initial.leakage_rate * 100).toFixed(2)) : ''
  )
  const [period, setPeriod] = useState<MonthRange | null>(null)
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const selectedRefrigerant = refrigerants.find(r => r.id === refrigerantId)
  const selectedAsset = assetCategories.find(a => a.id === assetCategoryId)
  const effectiveGwp = selectedRefrigerant?.gwp_value ?? (parseFloat(gwpOverride) || initial.gwp_value)
  const effectiveRate = leakageRatePct
    ? parseFloat(leakageRatePct) / 100
    : (selectedAsset?.annual_leakage_rate ?? initial.leakage_rate ?? 0)

  const preview = (() => {
    if (!effectiveGwp) return null
    if (method === 'top_up') {
      const mass = parseFloat(massRefilled)
      if (!mass || mass <= 0) return null
      return (mass * effectiveGwp / 1000).toFixed(6)
    } else {
      const cap = parseFloat(totalCapacity)
      if (!cap || cap <= 0 || !effectiveRate) return null
      return (cap * effectiveRate * effectiveGwp / 1000).toFixed(6)
    }
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const hasRefrigerant = Boolean(selectedRefrigerant) || parseFloat(gwpOverride) > 0
    if (!hasRefrigerant) {
      setError('Pilih refrigeran dari daftar atau isi GWP manual')
      return
    }
    if (method === 'screening' && !selectedAsset && !leakageRatePct.trim()) {
      setError('Pilih kategori aset atau isi leakage rate manual')
      return
    }

    if (!period) {
      setError('Pilih bulan')
      return
    }

    setLoading(true)

    const refrigerantName = selectedRefrigerant?.refrigerant_name ?? initial.refrigerant_name
    const gwp = effectiveGwp

    let result
    if (method === 'top_up') {
      result = await updateFugitive(id, {
        method: 'top_up',
        refrigerant_name: refrigerantName,
        refrigerant_gwp_id: refrigerantId || undefined,
        gwp_value: gwp,
        mass_refilled_kg: parseFloat(massRefilled),
        period_start: period.period_start,
        period_end: period.period_end,
        notes: notes || undefined,
      })
    } else {
      result = await updateFugitive(id, {
        method: 'screening',
        refrigerant_name: refrigerantName,
        refrigerant_gwp_id: refrigerantId || undefined,
        gwp_value: gwp,
        asset_category_id: assetCategoryId || undefined,
        asset_category_name: selectedAsset?.category_name ?? initial.asset_category_name ?? '',
        total_capacity_kg: parseFloat(totalCapacity),
        leakage_rate: effectiveRate,
        period_start: period.period_start,
        period_end: period.period_end,
        notes: notes || undefined,
      })
    }

    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSaved(true)
    toast.success('Draft fugitive berhasil diperbarui')
    router.refresh()
    setTimeout(() => onSaved?.(), 800)
  }

  return (
    <div className="bg-gradient-to-br from-mint/40 via-sage/5 to-surface border border-sage/20 rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(85,158,123,0.12)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-lg bg-sage text-white flex items-center justify-center flex-shrink-0 shadow-[0_6px_12px_-4px_rgba(85,158,123,0.3)]">
          <Sun className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
            Mode Edit Draft
          </span>
          <p className="text-xs text-sage-dark/80 font-medium mt-0.5">Scope 1 — Fugitive Emissions</p>
        </div>
      </div>

      {saved && (
        <div className="mb-4 bg-mint border border-sage/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <Check className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
          <p className="text-sm text-sage-dark font-medium">Perubahan tersimpan. Kalkulasi diperbarui.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Method toggle */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Metode</label>
          <div className="flex gap-1 bg-surface border border-border p-1 rounded-full">
            {(['screening', 'top_up'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`flex-1 py-2 text-xs rounded-full font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  method === m ? 'bg-gray-800 text-white shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {m === 'screening' ? (
                  <>
                    <ClipboardList className="w-3.5 h-3.5" /> Screening
                  </>
                ) : (
                  <>
                    <Wrench className="w-3.5 h-3.5" /> Top-Up
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Refrigerant */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Refrigeran <span className="text-sage-dark">*</span>
          </label>
          <select
            value={refrigerantId}
            onChange={e => {
              setRefrigerantId(e.target.value)
              const r = refrigerants.find(r => r.id === e.target.value)
              if (r) setGwpOverride(String(r.gwp_value))
            }}
            className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
          >
            <option value="">Pilih dari master data...</option>
            {refrigerants.map(r => (
              <option key={r.id} value={r.id}>
                {r.refrigerant_name} ({r.gas_type}) — GWP {r.gwp_value.toLocaleString()}
              </option>
            ))}
          </select>
          {!refrigerantId && (
            <div className="mt-3">
              <label className="block text-[10px] font-semibold text-muted mb-1.5">
                GWP Manual <span className="text-muted/70">(jika tidak ada di daftar)</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={gwpOverride}
                onChange={e => setGwpOverride(e.target.value)}
                placeholder="e.g. 1430"
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              />
            </div>
          )}
        </div>

        {method === 'top_up' && (
          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Massa Diisi Ulang (kg) <span className="text-sage-dark">*</span>
            </label>
            <input
              required
              type="text"
              inputMode="decimal"
              value={massRefilled}
              onChange={e => setMassRefilled(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder="e.g. 2.5"
            />
          </div>
        )}

        {method === 'screening' && (
          <div className="space-y-3 bg-surface border border-border rounded-xl p-4">
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Parameter Screening</p>

            <div>
              <label className="block text-[10px] font-semibold text-ink mb-1.5">Kategori Aset</label>
              <select
                value={assetCategoryId}
                onChange={e => {
                  setAssetCategoryId(e.target.value)
                  const a = assetCategories.find(a => a.id === e.target.value)
                  if (a) setLeakageRatePct(String((a.annual_leakage_rate * 100).toFixed(2)))
                }}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              >
                <option value="">Pilih kategori aset...</option>
                {assetCategories.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.category_name} — {(a.annual_leakage_rate * 100).toFixed(2)}%/tahun
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ink mb-1.5">
                Total Kapasitas Sistem (kg) <span className="text-sage-dark">*</span>
              </label>
              <input
                required
                type="text"
                inputMode="decimal"
                value={totalCapacity}
                onChange={e => setTotalCapacity(e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                placeholder="Total isi refrigeran (kg)"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-ink mb-1.5">Leakage Rate (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={leakageRatePct}
                onChange={e => setLeakageRatePct(e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                placeholder="e.g. 5 (untuk 5%)"
              />
            </div>
          </div>
        )}

        {preview && (
          <div className="bg-mint/40 border border-sage/30 rounded-xl px-4 py-3 flex items-center gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5 text-sage-dark" strokeWidth={2} />
            <p className="text-xs text-sage-dark">
              Estimasi emisi: <span className="font-extrabold tracking-tight">{preview} tCO₂e</span>
            </p>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Periode (Bulan & Tahun) <span className="text-sage-dark">*</span>
          </label>
          <SingleMonthPicker seedStart={initial.period_start} onChange={setPeriod} />
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Catatan <span className="text-muted font-normal">(opsional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Tambahkan catatan..."
            className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group w-full bg-sage hover:bg-sage-dark text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Menyimpan...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Simpan Perubahan & Hitung Ulang
            </>
          )}
        </button>
      </form>
    </div>
  )
}