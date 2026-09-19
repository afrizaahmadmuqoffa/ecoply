'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateVehicle } from '@/lib/supabase/actions/carbon-activity'
import SingleMonthPicker, { type MonthRange } from './SingleMonthPicker'
import { AlertTriangle, BadgeCheck, Check, Loader2, Truck } from 'lucide-react'

type VehicleFactor = { id: string; vehicle_type: string; unit: string; ef_co2e: number }

type Props = {
  id: string
  factors: VehicleFactor[]
  initial: {
    ef_vehicle_id: string | null
    vehicle_type: string
    unit: string
    distance: number
    period_start: string
    period_end: string
    notes: string | null
  }
  onSaved?: () => void
}

export default function EditVehicleForm({ id, factors, initial, onSaved }: Props) {
  const router = useRouter()
  const [vehicleId, setVehicleId] = useState(initial.ef_vehicle_id ?? '')
  const [distance, setDistance] = useState(String(initial.distance))
  const [period, setPeriod] = useState<MonthRange | null>(null)
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const selectedFactor = factors.find(f => f.id === vehicleId)
  const preview = selectedFactor && parseFloat(distance) > 0
    ? (parseFloat(distance) * selectedFactor.ef_co2e / 1000).toFixed(6)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!selectedFactor) {
      setError('Pilih jenis kendaraan terlebih dahulu')
      return
    }

    if (!period) {
      setError('Pilih bulan')
      return
    }

    setLoading(true)

    const result = await updateVehicle(id, {
      ef_vehicle_id: vehicleId,
      vehicle_type: selectedFactor?.vehicle_type ?? initial.vehicle_type,
      unit: (selectedFactor?.unit ?? initial.unit) as 'km' | 'mile',
      distance: parseFloat(distance),
      period_start: period.period_start,
      period_end: period.period_end,
      notes: notes || undefined,
    })

    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSaved(true)
    toast.success('Draft kendaraan berhasil diperbarui')
    router.refresh()
    setTimeout(() => onSaved?.(), 800)
  }

  return (
    <div className="bg-gradient-to-br from-mint/40 via-sage/5 to-surface border border-sage/20 rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(85,158,123,0.12)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-lg bg-sage text-white flex items-center justify-center flex-shrink-0 shadow-[0_6px_12px_-4px_rgba(85,158,123,0.3)]">
          <Truck className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
            Mode Edit Draft
          </span>
          <p className="text-xs text-sage-dark/80 font-medium mt-0.5">Scope 1 — Mobile (Kendaraan/Jarak)</p>
        </div>
      </div>

      {saved && (
        <div className="mb-4 bg-mint border border-sage/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <Check className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
          <p className="text-sm text-sage-dark font-medium">Perubahan tersimpan. Kalkulasi diperbarui.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Jenis Kendaraan <span className="text-sage-dark">*</span>
          </label>
          {factors.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-800">
                Belum ada data kendaraan. Admin perlu menambahkan di Carbon Config.
              </p>
            </div>
          ) : (
            <select
              required
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            >
              <option value="">Pilih jenis kendaraan...</option>
              {factors.map(f => (
                <option key={f.id} value={f.id}>
                  {f.vehicle_type} — {f.ef_co2e} kg CO₂e/{f.unit}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedFactor && (
          <div className="bg-surface border border-border rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Faktor Terpilih</p>
            <p className="text-sm text-ink font-mono font-semibold tracking-tight">
              {selectedFactor.ef_co2e} kg CO₂e per {selectedFactor.unit}
            </p>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Jarak Tempuh {selectedFactor ? `(${selectedFactor.unit})` : `(${initial.unit})`} <span className="text-sage-dark">*</span>
          </label>
          <input
            required
            type="text"
            inputMode="decimal"
            value={distance}
            onChange={e => setDistance(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
          />
          {preview && (
            <div className="mt-2 bg-mint/40 border border-sage/30 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5 text-sage-dark" strokeWidth={2} />
              <p className="text-xs text-sage-dark">
                Estimasi: <span className="font-extrabold tracking-tight">{preview} tCO₂e</span>
              </p>
            </div>
          )}
        </div>

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