'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitCombustion } from '@/lib/supabase/actions/carbon-activity'
import SingleMonthPicker, { type MonthRange } from './SingleMonthPicker'
import { AlertTriangle, BadgeCheck, Check, Flame, Loader2 } from 'lucide-react'

type Factor = { id: string; scope_category: string; fuel_name: string; unit: string; ef_scope1_co2e: number; is_fossil: boolean }
type Props = { factors: Factor[] }

export default function Scope1StationaryForm({ factors }: Props) {
  const router = useRouter()
  const [selectedFuelId, setSelectedFuelId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [period, setPeriod] = useState<MonthRange | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedFactor = factors.find(f => f.id === selectedFuelId)

  const fuelGroups = useMemo(() => {
    const map = new Map<string, Factor[]>()
    factors.forEach(f => {
      if (!map.has(f.fuel_name)) map.set(f.fuel_name, [])
      map.get(f.fuel_name)!.push(f)
    })
    return map
  }, [factors])

  const q = parseFloat(quantity)
  const preview = selectedFactor && q > 0 && !isNaN(q)
    ? (q * selectedFactor.ef_scope1_co2e / 1000).toFixed(6)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFactor) { setError('Pilih bahan bakar'); return }
    if (!period) { setError('Pilih bulan'); return }
    setError(null); setLoading(true)
    const result = await submitCombustion({
      scope_category: 'stationary',
      ef_combustion_id: selectedFactor.id,
      fuel_name: selectedFactor.fuel_name,
      unit: selectedFactor.unit,
      quantity: q,
      period_start: period.period_start,
      period_end: period.period_end,
      notes: notes || undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else {
      toast.success('Draft aktivitas pembakaran berhasil disimpan')
      router.push('/company/carbon')
    }
  }

  return (
    <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_6px_12px_-4px_rgba(245,158,11,0.3)]">
          <Flame className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-800 block">Scope 1</span>
          <p className="text-sm font-extrabold text-ink tracking-tight">Stationary Combustion</p>
          <p className="text-xs text-muted mt-0.5">Emisi dari pembakaran genset, boiler, furnace</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Bahan Bakar <span className="text-sage-dark">*</span>
          </label>
          {factors.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-xs text-amber-800">
                Belum ada faktor emisi stationary. Admin perlu menambahkan di Carbon Config.
              </p>
            </div>
          ) : (
            <select required value={selectedFuelId} onChange={e => setSelectedFuelId(e.target.value)}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all">
              <option value="">Pilih bahan bakar...</option>
              {Array.from(fuelGroups.entries()).map(([fuelName, fuelFactors]) => (
                <optgroup key={fuelName} label={fuelName}>
                  {fuelFactors.map(f => (
                    <option key={f.id} value={f.id}>{f.fuel_name} / {f.unit} → {f.ef_scope1_co2e} kg CO₂e/{f.unit}{!f.is_fossil ? ' (non-fosil)' : ''}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </div>

        {selectedFactor && (
          <div className="bg-canvas border border-border rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Faktor Terpilih</p>
            <p className="text-sm text-ink font-mono font-semibold tracking-tight">
              {selectedFactor.ef_scope1_co2e} kg CO₂e per {selectedFactor.unit}
            </p>
            {!selectedFactor.is_fossil && (
              <p className="text-xs text-amber-800 mt-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
                Non-fosil — emisi dicatat sebagai Outside of Scope
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Jumlah {selectedFactor ? `(${selectedFactor.unit})` : ''} <span className="text-sage-dark">*</span>
          </label>
          <input required type="text" inputMode="decimal" value={quantity} onChange={e => setQuantity(e.target.value)}
            className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            placeholder="e.g. 500" />
        </div>

        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Periode (1 Bulan)</p>
          <SingleMonthPicker onChange={setPeriod} />
        </div>

        {preview && (
          <div className="bg-mint/40 border border-sage/30 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5 text-sage-dark" strokeWidth={2} />
            <p className="text-xs text-sage-dark">
              Estimasi:{' '}
              <span className="font-extrabold tracking-tight">{preview} tCO₂e</span>
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

        <button type="submit" disabled={loading || !selectedFuelId || !(q > 0)}
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