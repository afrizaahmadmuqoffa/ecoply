'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitFugitive } from '@/lib/supabase/actions/carbon-activity'
import SingleMonthPicker, { type MonthRange } from './SingleMonthPicker'
import { AlertTriangle, BadgeCheck, Check, ClipboardList, Info, Loader2, Sun, Wrench } from 'lucide-react'

type Refrigerant = { id: string; refrigerant_name: string; gwp_value: number; gas_type: string }
type AssetCategory = { id: string; category_name: string; annual_leakage_rate: number; typical_refrigerant: string | null }
type Props = { refrigerants: Refrigerant[]; assetCategories: AssetCategory[] }

export default function Scope1FugitiveForm({ refrigerants, assetCategories }: Props) {
  const router = useRouter()
  const [method, setMethod] = useState<'top_up' | 'screening'>('screening')
  const [refrigerantId, setRefrigerantId] = useState('')
  const [massRefilled, setMassRefilled] = useState('')
  const [assetCategoryId, setAssetCategoryId] = useState('')
  const [totalCapacity, setTotalCapacity] = useState('')
  const [leakageRateOverride, setLeakageRateOverride] = useState('')
  const [useCustomLeakage, setUseCustomLeakage] = useState(false)
  const [period, setPeriod] = useState<MonthRange | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedRefrigerant = refrigerants.find(r => r.id === refrigerantId)
  const selectedAsset = assetCategories.find(a => a.id === assetCategoryId)
  const effectiveRate = useCustomLeakage && leakageRateOverride
    ? parseFloat(leakageRateOverride) / 100
    : selectedAsset?.annual_leakage_rate ?? 0

  const preview = useMemo(() => {
    if (!selectedRefrigerant) return null
    const gwp = selectedRefrigerant.gwp_value
    if (method === 'top_up') {
      const mass = parseFloat(massRefilled)
      if (!mass || mass <= 0) return null
      return (mass * gwp / 1000).toFixed(6)
    } else {
      const cap = parseFloat(totalCapacity)
      if (!cap || cap <= 0 || !effectiveRate) return null
      return (cap * effectiveRate * gwp / 1000).toFixed(6)
    }
  }, [method, selectedRefrigerant, massRefilled, totalCapacity, effectiveRate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRefrigerant) { setError('Pilih refrigeran'); setLoading(false); return }
    if (!period) { setError('Pilih bulan'); setLoading(false); return }
    setError(null); setLoading(true)

    const base = {
      refrigerant_name: selectedRefrigerant.refrigerant_name,
      refrigerant_gwp_id: selectedRefrigerant.id,
      gwp_value: selectedRefrigerant.gwp_value,
      period_start: period.period_start,
      period_end: period.period_end,
      notes: notes || undefined,
    }

    let result
    if (method === 'top_up') {
      const mass = parseFloat(massRefilled)
      if (!mass || mass <= 0) { setError('Isi jumlah top-up keseluruhan (kg)'); setLoading(false); return }
      result = await submitFugitive({ method: 'top_up', mass_refilled_kg: mass, ...base })
    } else {
      const cap = parseFloat(totalCapacity)
      if (!cap || cap <= 0) { setError('Isi total kapasitas sistem'); setLoading(false); return }
      if (method === 'screening' && !assetCategoryId && !useCustomLeakage) {
        setError('Pilih kategori aset'); setLoading(false); return
      }
      result = await submitFugitive({
        method: 'screening',
        asset_category_id: selectedAsset?.id,
        asset_category_name: selectedAsset?.category_name ?? '',
        total_capacity_kg: cap,
        leakage_rate: effectiveRate,
        ...base,
      })
    }

    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else {
      toast.success('Draft fugitif berhasil disimpan')
      router.push('/company/carbon')
    }
  }

  const canSubmit = !!refrigerantId && !!period &&
    (method === 'top_up'
      ? parseFloat(massRefilled) > 0
      : (!!assetCategoryId && parseFloat(totalCapacity) > 0))

  return (
    <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_6px_12px_-4px_rgba(245,158,11,0.3)]">
          <Sun className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-800 block">Scope 1</span>
          <p className="text-sm font-extrabold text-ink tracking-tight">Fugitive Emissions</p>
          <p className="text-xs text-muted mt-0.5">Emisi dari kebocoran refrigeran AC, chiller, dll</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Metode</label>
          <div className="flex gap-1 bg-canvas border border-border p-1 rounded-full">
            {(['screening', 'top_up'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMethod(m)}
                className={`flex-1 py-2 text-xs rounded-full font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  method === m ? 'bg-gray-800 text-white shadow-sm' : 'text-muted hover:text-ink'
                }`}>
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

        {method === 'screening' && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <p className="text-xs text-sky-800 leading-relaxed">
              Leakage rate dari standar IPCC/DEFRA per kategori alat. Lebih akurat untuk pelaporan resmi.
            </p>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Refrigeran <span className="text-sage-dark">*</span>
          </label>
          <select required value={refrigerantId} onChange={e => setRefrigerantId(e.target.value)}
            className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all">
            <option value="">Pilih refrigeran...</option>
            {refrigerants.map(r => <option key={r.id} value={r.id}>{r.refrigerant_name} ({r.gas_type}) — GWP {r.gwp_value.toLocaleString()}</option>)}
          </select>
        </div>

        {method === 'top_up' && (
          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Jumlah Top-Up Keseluruhan (kg) <span className="text-sage-dark">*</span>
            </label>
            <input required type="text" inputMode="decimal" value={massRefilled} onChange={e => setMassRefilled(e.target.value)}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder="Total kg refrigeran yang ditambahkan" />
          </div>
        )}

        {method === 'screening' && (
          <div className="space-y-3 bg-canvas/40 rounded-xl p-4 border border-border">
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Parameter Screening</p>

            <div>
              <label className="block text-[10px] font-semibold text-ink mb-1.5">
                Kategori Aset <span className="text-sage-dark">*</span>
              </label>
              {assetCategories.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-800">Belum ada kategori aset. Admin perlu menambahkan.</p>
                </div>
              ) : (
                <select required value={assetCategoryId} onChange={e => setAssetCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all">
                  <option value="">Pilih kategori aset...</option>
                  {assetCategories.map(a => <option key={a.id} value={a.id}>{a.category_name} — {(a.annual_leakage_rate * 100).toFixed(2)}%/tahun</option>)}
                </select>
              )}
            </div>

            {selectedAsset && (
              <div className="bg-surface border border-border rounded-xl px-4 py-3">
                <p className="text-xs text-muted">
                  Leakage rate standar: <span className="font-mono font-bold text-ink">{(selectedAsset.annual_leakage_rate * 100).toFixed(2)}%</span> per tahun
                </p>
                {selectedAsset.typical_refrigerant && (
                  <p className="text-xs text-muted mt-1">
                    Refrigeran umum: <span className="font-mono text-ink">{selectedAsset.typical_refrigerant}</span>
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-ink mb-1.5">
                Total Kapasitas Sistem (kg) <span className="text-sage-dark">*</span>
              </label>
              <input required type="text" inputMode="decimal" value={totalCapacity} onChange={e => setTotalCapacity(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                placeholder="Total isi refrigeran semua unit (kg)" />
            </div>

            <label className="flex items-start gap-2.5 p-3 bg-surface border border-border rounded-xl cursor-pointer hover:border-sage/40 transition-colors">
              <input type="checkbox" checked={useCustomLeakage} onChange={e => setUseCustomLeakage(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border text-sage focus:ring-sage" />
              <div>
                <p className="text-sm font-semibold text-ink">Override leakage rate</p>
                <p className="text-xs text-muted mt-0.5">Gunakan jika ada data aktual</p>
              </div>
            </label>

            {useCustomLeakage && (
              <div>
                <label className="block text-[10px] font-semibold text-ink mb-1.5">Leakage Rate Aktual (%)</label>
                <input type="text" inputMode="decimal" value={leakageRateOverride} onChange={e => setLeakageRateOverride(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                  placeholder="e.g. 5 (untuk 5%)" />
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Periode (1 Bulan)</p>
          <SingleMonthPicker onChange={setPeriod} />
        </div>

        {preview && (
          <div className="bg-mint/40 border border-sage/30 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <BadgeCheck className="w-3.5 h-3.5 text-sage-dark" strokeWidth={2} />
              <p className="text-xs text-sage-dark">
                Estimasi emisi: <span className="font-extrabold tracking-tight">{preview} tCO₂e</span>
                {period && <span className="text-muted ml-1">({period.label})</span>}
              </p>
            </div>
            {method === 'top_up' && parseFloat(massRefilled) > 0 && (
              <p className="text-[11px] text-sage-dark/70">
                {parseFloat(massRefilled).toLocaleString('id-ID')} kg · GWP {selectedRefrigerant?.gwp_value.toLocaleString() ?? ''}
              </p>
            )}
            {selectedRefrigerant && method === 'screening' && (
              <p className="text-[11px] text-sage-dark/70">
                GWP {selectedRefrigerant.refrigerant_name} = {selectedRefrigerant.gwp_value.toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Catatan <span className="text-muted font-normal">(opsional)</span>
          </label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tambahkan catatan..."
            className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading || !canSubmit}
          className="group w-full bg-sage hover:bg-sage-dark text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2">
          {loading ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Menyimpan...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Hitung & Simpan
            </>
          )}
        </button>
      </form>
    </div>
  )
}