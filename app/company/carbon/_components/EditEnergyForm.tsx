'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateEnergy } from '@/lib/supabase/actions/carbon-activity'
import SingleMonthPicker, { type MonthRange } from './SingleMonthPicker'
import { AlertTriangle, BadgeCheck, Check, CloudFog, Loader2, Zap } from 'lucide-react'

type GridFactor = { id: string; region_name: string; energy_type: string; unit: string; ef_kg_co2e: number; method: string | null }

type Props = {
  id: string
  gridFactors: GridFactor[]
  initial: {
    energy_type: 'electricity' | 'steam'
    grid_ef_id: string | null
    region_name: string | null
    unit: 'kWh' | 'MWh' | 'MMBtu'
    consumption: number
    use_custom_ef: boolean
    custom_ef_kg_co2e: number | null
    period_start: string
    period_end: string
    notes: string | null
  }
  onSaved?: () => void
}

export default function EditEnergyForm({ id, gridFactors, initial, onSaved }: Props) {
  const router = useRouter()
  const [energyType, setEnergyType] = useState<'electricity' | 'steam'>(initial.energy_type)
  const [gridByType, setGridByType] = useState<Record<'electricity' | 'steam', string>>(() => ({
    electricity: initial.energy_type === 'electricity' ? (initial.grid_ef_id ?? '') : '',
    steam: initial.energy_type === 'steam' ? (initial.grid_ef_id ?? '') : '',
  }))
  const [unitByType, setUnitByType] = useState<Record<'electricity' | 'steam', 'kWh' | 'MWh' | 'MMBtu'>>(() => ({
    electricity: initial.energy_type === 'electricity' ? initial.unit : 'kWh',
    steam: initial.energy_type === 'steam' ? initial.unit : 'MMBtu',
  }))
  const gridId = gridByType[energyType]
  const unit = unitByType[energyType]
  const [consumption, setConsumption] = useState(String(initial.consumption))
  const [useCustomEf, setUseCustomEf] = useState(initial.use_custom_ef)
  const [customEf, setCustomEf] = useState(initial.custom_ef_kg_co2e ? String(initial.custom_ef_kg_co2e) : '')
  const [period, setPeriod] = useState<MonthRange | null>(null)
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const currentFactors = gridFactors.filter(f => f.energy_type === energyType)
  const selectedGrid = currentFactors.find(f => f.id === gridId)
  const effectiveEf = useCustomEf ? parseFloat(customEf) : (selectedGrid?.ef_kg_co2e ?? 0)

  const preview = useMemo(() => {
    const c = parseFloat(consumption)
    if (!c || c <= 0 || !effectiveEf) return null
    return (c * effectiveEf / 1000).toFixed(6)
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [consumption, effectiveEf])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (useCustomEf) {
      if (!(parseFloat(customEf) > 0)) {
        setError('Isi faktor emisi custom yang valid')
        return
      }
    } else if (!selectedGrid) {
      setError('Pilih wilayah grid atau gunakan custom EF')
      return
    }

    if (!period) {
      setError('Pilih bulan')
      return
    }

    setLoading(true)

    const result = await updateEnergy(id, {
      energy_type: energyType,
      grid_ef_id: selectedGrid?.id,
      region_name: selectedGrid?.region_name,
      unit,
      consumption: parseFloat(consumption),
      use_custom_ef: useCustomEf,
      custom_ef_kg_co2e: useCustomEf ? parseFloat(customEf) : undefined,
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
    toast.success('Draft energi berhasil diperbarui')
    router.refresh()
    setTimeout(() => onSaved?.(), 800)
  }

  return (
    <div className="bg-gradient-to-br from-mint/40 via-sage/5 to-surface border border-sage/20 rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(85,158,123,0.12)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-lg bg-sage text-white flex items-center justify-center flex-shrink-0 shadow-[0_6px_12px_-4px_rgba(85,158,123,0.3)]">
          <Zap className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
            Mode Edit Draft
          </span>
          <p className="text-xs text-sage-dark/80 font-medium mt-0.5">Scope 2 — Konsumsi Energi</p>
        </div>
      </div>

      {saved && (
        <div className="mb-4 bg-mint border border-sage/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <Check className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
          <p className="text-sm text-sage-dark font-medium">Perubahan tersimpan. Kalkulasi diperbarui.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Energy type toggle */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Tipe Energi</label>
          <div className="flex gap-1 bg-surface border border-border p-1 rounded-full">
            {(['electricity', 'steam'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setEnergyType(t)}
                className={`flex-1 py-2 text-xs rounded-full font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  energyType === t ? 'bg-gray-800 text-white shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {t === 'electricity' ? (
                  <>
                    <Zap className="w-3.5 h-3.5" /> Listrik
                  </>
                ) : (
                  <>
                    <CloudFog className="w-3.5 h-3.5" /> Steam
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Grid EF */}
        {!useCustomEf && (
          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              {energyType === 'electricity' ? 'Wilayah Grid' : 'Sumber Steam'}
            </label>
            {currentFactors.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-800">Belum ada faktor emisi {energyType}.</p>
              </div>
            ) : (
              <select
                required
                value={gridId}
                onChange={e => setGridByType(p => ({ ...p, [energyType]: e.target.value }))}
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              >
                <option value="">Pilih...</option>
                {currentFactors.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.region_name} ({f.unit}) — {f.ef_kg_co2e} kg CO₂e/{f.unit}
                    {f.method ? ` · ${f.method.replace('_', '-')}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Unit toggle */}
        {energyType === 'electricity' && (
          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Satuan</label>
            <div className="flex gap-1 bg-surface border border-border p-1 rounded-full">
              {(['kWh', 'MWh'] as const).map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnitByType(p => ({ ...p, electricity: u }))}
                  className={`flex-1 py-2 text-xs rounded-full font-semibold transition-all ${
                    unit === u ? 'bg-gray-800 text-white shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Consumption */}
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Total Konsumsi ({unit}) <span className="text-sage-dark">*</span>
          </label>
          <input
            required
            type="text"
            inputMode="decimal"
            value={consumption}
            onChange={e => setConsumption(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            placeholder="e.g. 50000"
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

        {/* Custom EF checkbox */}
        <label className="flex items-start gap-2.5 p-3 bg-surface border border-border rounded-xl cursor-pointer hover:border-sage/40 transition-colors">
          <input
            type="checkbox"
            checked={useCustomEf}
            onChange={e => { setUseCustomEf(e.target.checked); if (!e.target.checked) setGridByType(p => ({ ...p, [energyType]: '' })) }}
            className="mt-0.5 w-4 h-4 rounded border-border text-sage focus:ring-sage"
          />
          <div>
            <p className="text-sm font-semibold text-ink">Gunakan faktor emisi custom</p>
            <p className="text-xs text-muted mt-0.5">Untuk market-based atau supplier spesifik</p>
          </div>
        </label>

        {useCustomEf && (
          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Faktor Emisi (kg CO₂e per {unit}) <span className="text-sage-dark">*</span>
            </label>
            <input
              required
              type="text"
              inputMode="decimal"
              value={customEf}
              onChange={e => setCustomEf(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder="e.g. 0.3"
            />
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