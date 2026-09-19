'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitS3C1 } from '@/lib/supabase/actions/carbon-activity'
import SingleMonthPicker, { type MonthRange } from './SingleMonthPicker'
import { AlertTriangle, BadgeCheck, BarChart3, Check, CircleDollarSign, Loader2, Package, Truck } from 'lucide-react'

type AvgFactor = { id: string; material_name: string; unit: string; ef_kg_co2e: number }
type SpendFactor = { id: string; sector_name: string; currency: string; ef_kg_co2e: number }
type Props = { avgFactors: AvgFactor[]; spendFactors: SpendFactor[] }

type Method = 'supplier_specific' | 'average_data' | 'spend_based'

const METHOD_INFO = {
  supplier_specific: {
    label: 'Metode 1 — Supplier Specific',
    hint: 'Faktor emisi dari supplier langsung. Paling akurat.',
    icon: (
      <Truck className="w-4 h-4" strokeWidth={1.8} />
    ),
  },
  average_data: {
    label: 'Metode 2 — Average Data',
    hint: 'Faktor emisi rata-rata per jenis material (DEFRA/ecoinvent).',
    icon: (
      <BarChart3 className="w-4 h-4" strokeWidth={1.8} />
    ),
  },
  spend_based: {
    label: 'Metode 3 — Spend Based',
    hint: 'Faktor EEIO berdasarkan nilai pengeluaran. Digunakan jika data fisik tidak tersedia.',
    icon: (
      <CircleDollarSign className="w-4 h-4" strokeWidth={1.8} />
    ),
  },
}

export default function Scope3C1Form({ avgFactors, spendFactors }: Props) {
  const router = useRouter()
  const [method, setMethod] = useState<Method>('average_data')

  const [supplierName, setSupplierName] = useState('')
  const [productName, setProductName] = useState('')
  const [supplierEf, setSupplierEf] = useState('')
  const [supplierUnit, setSupplierUnit] = useState('')
  const [supplierUnitCustom, setSupplierUnitCustom] = useState('')
  const [avgFactorId, setAvgFactorId] = useState('')
  const [spendFactorId, setSpendFactorId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [period, setPeriod] = useState<MonthRange | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedAvg = avgFactors.find(f => f.id === avgFactorId)
  const selectedSpend = spendFactors.find(f => f.id === spendFactorId)
  const finalSupplierUnit = supplierUnit === '__custom' ? supplierUnitCustom : supplierUnit
  const q = parseFloat(quantity)

  const preview = useMemo(() => {
    if (!q || q <= 0) return null
    if (method === 'supplier_specific') {
      const ef = parseFloat(supplierEf)
      if (!ef) return null
      return (q * ef / 1000).toFixed(6)
    }
    if (method === 'average_data' && selectedAvg) return (q * selectedAvg.ef_kg_co2e / 1000).toFixed(6)
    if (method === 'spend_based' && selectedSpend) return (q * selectedSpend.ef_kg_co2e / 1000).toFixed(6)
    return null
  }, [method, q, supplierEf, selectedAvg, selectedSpend])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!period) { setError('Pilih bulan'); setLoading(false); return }
    setError(null); setLoading(true)

    const base = { period_start: period.period_start, period_end: period.period_end, notes: notes || undefined }
    let result

    if (method === 'supplier_specific') {
      const safeSupplierUnit = supplierUnit === '__custom' ? supplierUnitCustom.trim() : supplierUnit
      if (!safeSupplierUnit) { setError('Pilih atau ketik satuan supplier'); setLoading(false); return }
      result = await submitS3C1({ method, supplier_name: supplierName, product_name: productName, supplier_ef_kg_co2e_per_unit: parseFloat(supplierEf), quantity: q, unit: safeSupplierUnit, ...base })
    } else if (method === 'average_data') {
      if (!selectedAvg) { setError('Pilih material'); setLoading(false); return }
      result = await submitS3C1({ method, ef_average_id: selectedAvg.id, quantity: q, unit: selectedAvg.unit, ...base })
    } else {
      if (!selectedSpend) { setError('Pilih sektor'); setLoading(false); return }
      result = await submitS3C1({ method, ef_spend_id: selectedSpend.id, quantity: q, currency: selectedSpend.currency, ...base })
    }

    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else {
      toast.success('Draft Scope 3 Cat 1 berhasil disimpan')
      router.push('/company/carbon')
    }
  }

  const unitLabel = method === 'average_data' ? (selectedAvg?.unit ?? 'unit') : method === 'spend_based' ? (selectedSpend?.currency ?? 'IDR') : finalSupplierUnit || supplierUnit || 'unit'

  const ready = method === 'supplier_specific'
    ? (supplierName && productName && parseFloat(supplierEf) > 0 && (supplierUnit === '__custom' ? !!supplierUnitCustom.trim() : !!supplierUnit))
    : method === 'average_data' ? !!selectedAvg : !!selectedSpend

  return (
    <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-lg bg-purple-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_6px_12px_-4px_rgba(168,85,247,0.3)]">
          <Package className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-purple-700 block">Scope 3</span>
          <p className="text-sm font-extrabold text-ink tracking-tight">Cat 1: Purchased Goods</p>
          <p className="text-xs text-muted mt-0.5">Emisi dari pembelian barang dan jasa</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-2">Metode Perhitungan</label>
          <div className="space-y-1.5">
            {(Object.entries(METHOD_INFO) as [Method, typeof METHOD_INFO[Method]][]).map(([m, info]) => (
              <button key={m} type="button" onClick={() => setMethod(m)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-start gap-3 ${
                  method === m
                    ? 'border-sage bg-mint/30'
                    : 'border-border bg-surface hover:border-sage/40'
                }`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  method === m ? 'bg-sage text-white' : 'bg-canvas text-muted'
                }`}>
                  {info.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink tracking-tight">{info.label}</p>
                  <p className="text-xs text-muted mt-0.5">{info.hint}</p>
                </div>
                {method === m && (
                  <Check className="w-5 h-5 text-sage-dark flex-shrink-0 mt-1" strokeWidth={2.5} />
                )}
              </button>
            ))}
          </div>
        </div>

        {method === 'supplier_specific' && (
          <div className="bg-canvas/40 rounded-xl p-4 border border-border space-y-3">
            <input required placeholder="Nama supplier *" value={supplierName} onChange={e => setSupplierName(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            <input required placeholder="Nama produk/jasa *" value={productName} onChange={e => setProductName(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-ink mb-1.5">
                  EF Supplier (kg CO₂e/unit) <span className="text-sage-dark">*</span>
                </label>
                <input required type="text" inputMode="decimal" value={supplierEf} onChange={e => setSupplierEf(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                  placeholder="dari dokumen supplier" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-ink mb-1.5">Satuan <span className="text-sage-dark">*</span></label>
                <select
                  value={supplierUnit === '__custom' ? '__custom' : supplierUnit}
                  onChange={e => {
                    const value = e.target.value
                    setSupplierUnit(value)
                    if (value !== '__custom') setSupplierUnitCustom('')
                  }}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                >
                  <option value="">Pilih satuan...</option>
                  {['kg', 'tonne', 'liter', 'unit', 'm³', 'kWh', 'MWh', 'IDR', 'USD'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  <option value="__custom">Lainnya...</option>
                </select>
                {supplierUnit === '__custom' && (
                  <input
                    value={supplierUnitCustom}
                    onChange={e => setSupplierUnitCustom(e.target.value)}
                    placeholder="Ketik satuan..."
                    className="w-full mt-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {method === 'average_data' && (
          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Material <span className="text-sage-dark">*</span>
            </label>
            {avgFactors.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-800">Belum ada faktor material. Admin perlu menambahkan.</p>
              </div>
            ) : (
              <select required value={avgFactorId} onChange={e => setAvgFactorId(e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all">
                <option value="">Pilih material...</option>
                {avgFactors.map(f => <option key={f.id} value={f.id}>{f.material_name} — {f.ef_kg_co2e} kg CO₂e/{f.unit}</option>)}
              </select>
            )}
          </div>
        )}

        {method === 'spend_based' && (
          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Sektor Industri <span className="text-sage-dark">*</span>
            </label>
            {spendFactors.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-800">Belum ada faktor EEIO. Admin perlu menambahkan.</p>
              </div>
            ) : (
              <select required value={spendFactorId} onChange={e => setSpendFactorId(e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all">
                <option value="">Pilih sektor...</option>
                {spendFactors.map(f => <option key={f.id} value={f.id}>{f.sector_name} ({f.currency}) — {f.ef_kg_co2e} kg CO₂e/{f.currency}</option>)}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            {method === 'spend_based' ? `Nilai Pengeluaran (${selectedSpend?.currency ?? 'IDR'})` : `Jumlah (${unitLabel})`}
            <span className="text-sage-dark"> *</span>
          </label>
          <input required type="text" inputMode="decimal" value={quantity} onChange={e => setQuantity(e.target.value)}
            className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            placeholder={method === 'spend_based' ? 'e.g. 50000' : 'e.g. 1000'} />
        </div>

        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Periode (1 Bulan)</p>
          <SingleMonthPicker onChange={setPeriod} />
        </div>

        {preview && (
          <div className="bg-mint/40 border border-sage/30 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5 text-sage-dark" strokeWidth={2} />
            <p className="text-xs text-sage-dark">
              Estimasi: <span className="font-extrabold tracking-tight">{preview} tCO₂e</span>
              {period && <span className="text-muted ml-1">({period.label})</span>}
            </p>
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

        <button type="submit" disabled={loading || !ready || !(q > 0)}
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