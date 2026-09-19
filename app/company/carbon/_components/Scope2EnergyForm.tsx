'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitEnergy } from '@/lib/supabase/actions/carbon-activity'
import SingleMonthPicker, { type MonthRange } from './SingleMonthPicker'
import { AlertTriangle, BadgeCheck, Check, CloudFog, Loader2, Zap } from 'lucide-react'

type GridFactor = { id: string; region_name: string; energy_type: string; unit: string; ef_kg_co2e: number; method: string | null }
type Props = { gridFactors: GridFactor[] }

export default function Scope2EnergyForm({ gridFactors }: Props) {
  const router = useRouter()
  const [energyType, setEnergyType] = useState<'electricity' | 'steam'>('electricity')
  const [gridId, setGridId] = useState('')
  const [unit, setUnit] = useState<'kWh' | 'MWh' | 'MMBtu'>('kWh')
  const [consumption, setConsumption] = useState('')
  const [useCustomEf, setUseCustomEf] = useState(false)
  const [customEf, setCustomEf] = useState('')
  const [period, setPeriod] = useState<MonthRange | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const electricityFactors = gridFactors.filter(f => f.energy_type === 'electricity')
  const steamFactors = gridFactors.filter(f => f.energy_type === 'steam')
  const currentFactors = energyType === 'electricity' ? electricityFactors : steamFactors

  const selectedGrid = currentFactors.find(f => f.id === gridId)
  const selectedEf = selectedGrid?.ef_kg_co2e ?? 0
  const c = parseFloat(consumption)
  const customEfValue = parseFloat(customEf)

  const preview = (() => {
    const ef = useCustomEf ? customEfValue : selectedEf
    if (!c || c <= 0 || !ef) return null
    return (c * ef / 1000).toFixed(6)
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!period) { setError('Pilih bulan'); setLoading(false); return }
    setError(null); setLoading(true)
    const result = await submitEnergy({
      energy_type: energyType,
      grid_ef_id: selectedGrid?.id,
      region_name: selectedGrid?.region_name,
      unit,
      consumption: c,
      use_custom_ef: useCustomEf,
      custom_ef_kg_co2e: useCustomEf ? customEfValue : undefined,
      period_start: period.period_start,
      period_end: period.period_end,
      notes: notes || undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else {
      toast.success('Draft energi berhasil disimpan')
      router.push('/company/carbon')
    }
  }

  const validEf = useCustomEf ? (customEfValue > 0) : !!gridId

  return (
    <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-lg bg-sky-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_6px_12px_-4px_rgba(14,165,233,0.3)]">
          <Zap className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sky-700 block">Scope 2</span>
          <p className="text-sm font-extrabold text-ink tracking-tight">Konsumsi Energi</p>
          <p className="text-xs text-muted mt-0.5">Emisi tidak langsung dari pembelian listrik atau steam</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Tipe Energi</label>
          <div className="flex gap-1 bg-canvas border border-border p-1 rounded-full">
            {(['electricity', 'steam'] as const).map(t => (
              <button key={t} type="button" onClick={() => { setEnergyType(t); setGridId(''); setUnit(t === 'steam' ? 'MMBtu' : 'kWh') }}
                className={`flex-1 py-2 text-xs rounded-full font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  energyType === t ? 'bg-gray-800 text-white shadow-sm' : 'text-muted hover:text-ink'
                }`}>
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

        {!useCustomEf && (
          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              {energyType === 'electricity' ? 'Wilayah Grid' : 'Sumber Steam'} <span className="text-sage-dark">*</span>
            </label>
            {currentFactors.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-800">Belum ada faktor emisi {energyType}. Admin perlu menambahkan.</p>
              </div>
            ) : (
              <select required={!useCustomEf} value={gridId} onChange={e => setGridId(e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all">
                <option value="">Pilih...</option>
                {currentFactors.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.region_name} ({f.unit}) — {f.ef_kg_co2e} kg CO₂e/{f.unit}{f.method ? ` · ${f.method.replace('_', '-')}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {energyType === 'electricity' && (
          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Satuan</label>
            <div className="flex gap-1 bg-canvas border border-border p-1 rounded-full">
              {(['kWh', 'MWh'] as const).map(u => (
                <button key={u} type="button" onClick={() => setUnit(u)}
                  className={`flex-1 py-2 text-xs rounded-full font-semibold transition-all ${
                    unit === u ? 'bg-gray-800 text-white shadow-sm' : 'text-muted hover:text-ink'
                  }`}>{u}</button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
            Total Konsumsi ({unit}) <span className="text-sage-dark">*</span>
          </label>
          <input required type="text" inputMode="decimal" value={consumption} onChange={e => setConsumption(e.target.value)}
            className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            placeholder="e.g. 50000" />
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

        <label className="flex items-start gap-2.5 p-3 bg-canvas border border-border rounded-xl cursor-pointer hover:border-sage/40 transition-colors">
          <input type="checkbox" checked={useCustomEf} onChange={e => { setUseCustomEf(e.target.checked); if (!e.target.checked) setGridId('') }}
            className="mt-0.5 w-4 h-4 rounded border-border text-sage focus:ring-sage" />
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
            <input required type="text" inputMode="decimal" value={customEf} onChange={e => setCustomEf(e.target.value)}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder="e.g. 0.3" />
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

        <button type="submit" disabled={loading || !validEf || !(c > 0)}
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