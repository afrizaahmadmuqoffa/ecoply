'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitCombustion, submitVehicle } from '@/lib/supabase/actions/carbon-activity'
import SingleMonthPicker, { type MonthRange } from './SingleMonthPicker'
import { AlertTriangle, BadgeCheck, Check, Droplets, Loader2, Ruler, Truck } from 'lucide-react'

type CombustionFactor = { id: string; scope_category: string; fuel_name: string; unit: string; ef_scope1_co2e: number; is_fossil: boolean }
type VehicleFactor = { id: string; vehicle_type: string; unit: string; ef_co2e: number }
type Props = { mobileFuels: CombustionFactor[]; vehicleFactors: VehicleFactor[] }

type Method = 'by_fuel' | 'by_distance'

export default function Scope1MobileForm({ mobileFuels, vehicleFactors }: Props) {
  const router = useRouter()
  const [method, setMethod] = useState<Method>('by_fuel')

  const [fuelId, setFuelId] = useState('')
  const [fuelQuantity, setFuelQuantity] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [distance, setDistance] = useState('')
  const [period, setPeriod] = useState<MonthRange | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedFuel = mobileFuels.find(f => f.id === fuelId)
  const selectedVehicle = vehicleFactors.find(f => f.id === vehicleId)

  const fuelGroups = useMemo(() => {
    const map = new Map<string, CombustionFactor[]>()
    mobileFuels.forEach(f => {
      if (!map.has(f.fuel_name)) map.set(f.fuel_name, [])
      map.get(f.fuel_name)!.push(f)
    })
    return map
  }, [mobileFuels])

  const preview = useMemo(() => {
    if (method === 'by_fuel') {
      if (!selectedFuel) return null
      const q = parseFloat(fuelQuantity)
      if (!q || q <= 0) return null
      return (q * selectedFuel.ef_scope1_co2e / 1000).toFixed(6)
    } else {
      if (!selectedVehicle) return null
      const d = parseFloat(distance)
      if (!d || d <= 0) return null
      return (d * selectedVehicle.ef_co2e / 1000).toFixed(6)
    }
  }, [method, selectedFuel, fuelQuantity, selectedVehicle, distance])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!period) { setError('Pilih bulan'); setLoading(false); return }
    setError(null); setLoading(true)

    let result
    if (method === 'by_fuel') {
      if (!selectedFuel) { setError('Pilih bahan bakar'); setLoading(false); return }
      const q = parseFloat(fuelQuantity)
      if (!q || q <= 0) { setError('Isi jumlah bahan bakar'); setLoading(false); return }
      result = await submitCombustion({
        scope_category: 'mobile',
        ef_combustion_id: selectedFuel.id,
        fuel_name: selectedFuel.fuel_name,
        unit: selectedFuel.unit,
        quantity: q,
        period_start: period.period_start,
        period_end: period.period_end,
        notes: notes || undefined,
      })
    } else {
      if (!selectedVehicle) { setError('Pilih jenis kendaraan'); setLoading(false); return }
      const d = parseFloat(distance)
      if (!d || d <= 0) { setError('Isi jarak tempuh'); setLoading(false); return }
      result = await submitVehicle({
        ef_vehicle_id: selectedVehicle.id,
        vehicle_type: selectedVehicle.vehicle_type,
        unit: selectedVehicle.unit as 'km' | 'mile',
        distance: d,
        period_start: period.period_start,
        period_end: period.period_end,
        notes: notes || undefined,
      })
    }

    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else {
      toast.success('Draft aktivitas mobile berhasil disimpan')
      router.push('/company/carbon')
    }
  }

  const validQty = method === 'by_fuel' ? (parseFloat(fuelQuantity) > 0) : (parseFloat(distance) > 0)

  return (
    <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_6px_12px_-4px_rgba(245,158,11,0.3)]">
          <Truck className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-800 block">Scope 1</span>
          <p className="text-sm font-extrabold text-ink tracking-tight">Mobile Combustion</p>
          <p className="text-xs text-muted mt-0.5">Emisi dari kendaraan & transportasi mobile</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Method Toggle */}
        <div className="flex gap-1 bg-canvas border border-border p-1 rounded-full">
          {(['by_fuel', 'by_distance'] as const).map(m => (
            <button key={m} type="button" onClick={() => { setMethod(m); setError(null) }}
              className={`flex-1 py-2 text-xs rounded-full font-semibold transition-all flex items-center justify-center gap-1.5 ${
                method === m ? 'bg-gray-800 text-white shadow-sm' : 'text-muted hover:text-ink'
              }`}>
              {m === 'by_fuel' ? (
                <>
                  <Droplets className="w-3.5 h-3.5" /> By Fuel
                </>
              ) : (
                <>
                  <Ruler className="w-3.5 h-3.5" /> By Distance
                </>
              )}
            </button>
          ))}
        </div>

        {method === 'by_fuel' ? (
          <>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Bahan Bakar Kendaraan <span className="text-sage-dark">*</span>
              </label>
              {mobileFuels.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-800">
                    Belum ada faktor emisi mobile fuel. Admin perlu menambahkan di Carbon Config.
                  </p>
                </div>
              ) : (
                <select required value={fuelId} onChange={e => setFuelId(e.target.value)}
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

            {selectedFuel && (
              <div className="bg-canvas border border-border rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Faktor Terpilih</p>
                <p className="text-sm text-ink font-mono font-semibold tracking-tight">
                  {selectedFuel.ef_scope1_co2e} kg CO₂e per {selectedFuel.unit}
                </p>
                {!selectedFuel.is_fossil && (
                  <p className="text-xs text-amber-800 mt-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
                    Non-fosil — emisi dicatat sebagai Outside of Scope
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Jumlah {selectedFuel ? `(${selectedFuel.unit})` : ''} <span className="text-sage-dark">*</span>
              </label>
              <input required type="text" inputMode="decimal" value={fuelQuantity} onChange={e => setFuelQuantity(e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                placeholder="e.g. 500" />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Jenis Kendaraan <span className="text-sage-dark">*</span>
              </label>
              {vehicleFactors.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-800">
                    Belum ada data kendaraan. Admin perlu menambahkan di Carbon Config.
                  </p>
                </div>
              ) : (
                <select required value={vehicleId} onChange={e => setVehicleId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all">
                  <option value="">Pilih jenis kendaraan...</option>
                  {vehicleFactors.map(f => <option key={f.id} value={f.id}>{f.vehicle_type} — {f.ef_co2e} kg CO₂e/{f.unit}</option>)}
                </select>
              )}
            </div>

            {selectedVehicle && (
              <div className="bg-canvas border border-border rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Faktor Terpilih</p>
                <p className="text-sm text-ink font-mono font-semibold tracking-tight">
                  {selectedVehicle.ef_co2e} kg CO₂e per {selectedVehicle.unit}
                </p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Jarak Tempuh {selectedVehicle ? `(${selectedVehicle.unit})` : ''} <span className="text-sage-dark">*</span>
              </label>
              <input required type="text" inputMode="decimal" value={distance} onChange={e => setDistance(e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                placeholder="e.g. 5000" />
            </div>
          </>
        )}

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

        <button type="submit" disabled={loading || (method === 'by_fuel' ? !fuelId : !vehicleId) || !validQty}
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