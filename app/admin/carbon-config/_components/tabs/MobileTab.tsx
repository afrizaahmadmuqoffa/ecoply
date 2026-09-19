'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, Check, Droplets, Loader2, Ruler } from 'lucide-react'
import MasterTable from '../MasterTable'
import {
  createCombustionFactor,
  deactivateCombustionFactor,
  createVehicleFactor,
  deactivateVehicleFactor,
} from '@/lib/supabase/actions/carbon-master'

type MobileFuelRow = {
  id: string; scope_category: string; fuel_name: string; unit: string
  ef_scope1_co2e: number; ef_outside_scope_co2e: number
  ef_co2: number | null; ef_ch4: number | null; ef_n2o: number | null
  is_fossil: boolean; source: string | null; year_reference: number | null; is_active: boolean
}

type VehicleRow = {
  id: string; vehicle_type: string; unit: 'km' | 'mile'
  ef_co2e: number; ef_co2: number | null; ef_ch4: number | null; ef_n2o: number | null
  source: string | null; year_reference: number | null; is_active: boolean
}

type Props = {
  mobileFuels: MobileFuelRow[]
  vehicles: VehicleRow[]
}

type Mode = 'by_fuel' | 'by_distance'

const FUEL_UNITS = ['liter', 'kg', 'm³', 'gallon']

export default function MobileTab({ mobileFuels, vehicles }: Props) {
  const [mode, setMode] = useState<Mode>('by_fuel')

  return (
    <div>
      {/* Mode toggle - pill segmented */}
      <div className="flex gap-1 mb-6 bg-canvas border border-border p-1 rounded-full w-fit">
        {(['by_fuel', 'by_distance'] as const).map((m) => (
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
            {m === 'by_fuel' ? (
              <span className="inline-flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5" /> By Fuel (Liter/Kg BBM)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5" /> By Distance (km/Jarak)
              </span>
            )}
          </button>
        ))}
      </div>

      {mode === 'by_fuel' ? (
        <MobileFuelSection rows={mobileFuels} />
      ) : (
        <VehicleDistanceSection rows={vehicles} />
      )}
    </div>
  )
}

function MobileFuelSection({ rows }: { rows: MobileFuelRow[] }) {
  const [form, setForm] = useState({
    fuel_name: '', unit: 'liter',
    ef_scope1_co2e: '', ef_outside_scope_co2e: '0',
    ef_co2: '', ef_ch4: '', ef_n2o: '',
    is_fossil: true, source: '', year_reference: new Date().getFullYear().toString(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const s = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    const result = await createCombustionFactor({
      scope_category: 'mobile',
      fuel_name: form.fuel_name, unit: form.unit,
      ef_scope1_co2e: parseFloat(form.ef_scope1_co2e),
      ef_outside_scope_co2e: parseFloat(form.ef_outside_scope_co2e) || 0,
      ef_co2: form.ef_co2 ? parseFloat(form.ef_co2) : undefined,
      ef_ch4: form.ef_ch4 ? parseFloat(form.ef_ch4) : undefined,
      ef_n2o: form.ef_n2o ? parseFloat(form.ef_n2o) : undefined,
      is_fossil: form.is_fossil, source: form.source || undefined,
      year_reference: parseInt(form.year_reference) || undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) } else {
      toast.success('Faktor bahan bakar berhasil ditambahkan')
      setSuccess(true)
      setForm({ ...form, fuel_name: '', ef_scope1_co2e: '', ef_outside_scope_co2e: '0', ef_co2: '', ef_ch4: '', ef_n2o: '' })
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
      <div className="lg:col-span-2 lg:sticky lg:top-6">
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <h3 className="text-lg font-extrabold text-ink tracking-tight mb-1">
            BBM <span className="text-sage">Kendaraan.</span>
          </h3>
          <p className="text-xs text-muted mb-5 leading-relaxed">
            Untuk kendaraan berdasarkan konsumsi BBM (liter/kg).
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Nama Bahan Bakar <span className="text-sage-dark">*</span>
              </label>
              <input required placeholder="e.g. Solar, Pertamax, Avtur" value={form.fuel_name} onChange={(e) => s('fuel_name', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Satuan</label>
              <select value={form.unit} onChange={(e) => s('unit', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all">
                {FUEL_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="bg-canvas rounded-xl p-4 border border-border space-y-3">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Faktor CO₂e per {form.unit}</p>
              <div>
                <label className="text-[10px] font-semibold text-ink mb-1 block">Scope 1 (kg CO₂e) <span className="text-sage-dark">*</span></label>
                <input required type="text" inputMode="decimal" placeholder="e.g. 2.678" value={form.ef_scope1_co2e} onChange={(e) => s('ef_scope1_co2e', e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-ink mb-1 block">Outside Scope (kg CO₂e) — biogenic</label>
                <input type="text" inputMode="decimal" placeholder="0 jika fosil" value={form.ef_outside_scope_co2e} onChange={(e) => s('ef_outside_scope_co2e', e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
              </div>
            </div>

            <div className="bg-canvas rounded-xl p-4 border border-border space-y-3">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Raw Gas Factors <span className="text-muted font-normal">(opsional)</span></p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[['ef_co2', 'CO₂'], ['ef_ch4', 'CH₄'], ['ef_n2o', 'N₂O']].map(([k, l]) => (
                  <div key={k}>
                    <label className="text-[10px] font-semibold text-ink mb-1 block">{l}</label>
                    <input type="text" inputMode="decimal" placeholder="0" value={form[k as keyof typeof form] as string} onChange={(e) => s(k, e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface border border-border rounded-md text-xs text-ink font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/20 transition-all" />
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={form.is_fossil} onChange={(e) => s('is_fossil', e.target.checked)}
                className="w-4 h-4 rounded border-border text-sage focus:ring-sage" />
              <span className="text-xs text-ink font-medium">Bahan bakar fosil (Scope 1 masuk total)</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-ink mb-1">Sumber</label>
                <input placeholder="DEFRA 2024, KLHK" value={form.source} onChange={(e) => s('source', e.target.value)}
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
        <MasterTable rows={rows} onDeactivate={deactivateCombustionFactor}
          editTable="ef_combustion" editTitle="Mobile Fuel Factor"
          editFields={[
            { key: 'fuel_name', label: 'Nama Bahan Bakar', type: 'text' },
            { key: 'unit', label: 'Satuan', type: 'text' },
            { key: 'ef_scope1_co2e', label: 'Scope 1 (kg CO₂e/unit)', type: 'number' },
            { key: 'ef_outside_scope_co2e', label: 'Outside Scope (kg CO₂e/unit)', type: 'number' },
            { key: 'ef_co2', label: 'CO₂ (kg)', type: 'number' },
            { key: 'ef_ch4', label: 'CH₄ (kg)', type: 'number' },
            { key: 'ef_n2o', label: 'N₂O (kg)', type: 'number' },
            { key: 'is_fossil', label: 'Fosil', type: 'checkbox' },
            { key: 'source', label: 'Sumber', type: 'text' },
            { key: 'year_reference', label: 'Tahun', type: 'number' },
          ]}
          columns={[
            { key: 'fuel_name', label: 'Bahan Bakar' },
            { key: 'unit', label: 'Satuan' },
            { key: 'ef_scope1_co2e', label: 'Scope 1', render: (r) => <span className="font-mono">{r.ef_scope1_co2e}</span> },
            { key: 'ef_outside_scope_co2e', label: 'Outside Scope', render: (r) => r.ef_outside_scope_co2e > 0 ? <span className="font-mono text-muted">{r.ef_outside_scope_co2e}</span> : <span className="text-muted/50">—</span> },
            { key: 'is_fossil', label: 'Fosil', render: (r) => r.is_fossil ? <span className="text-sage-dark font-semibold"><Check className="w-4 h-4" /></span> : <span className="text-muted/60">Non-fosil</span> },
            { key: 'source', label: 'Sumber', render: (r) => <span className="text-muted text-[11px]">{r.source ?? '—'}{r.year_reference ? ` · ${r.year_reference}` : ''}</span> },
          ]}
          emptyText="Belum ada faktor BBM kendaraan."
        />
      </div>
    </div>
  )
}

function VehicleDistanceSection({ rows }: { rows: VehicleRow[] }) {
  const [form, setForm] = useState({
    vehicle_type: '', unit: 'km' as 'km' | 'mile',
    ef_co2e: '', ef_co2: '', ef_ch4: '', ef_n2o: '',
    source: '', year_reference: new Date().getFullYear().toString(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const s = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    const result = await createVehicleFactor({
      vehicle_type: form.vehicle_type, unit: form.unit, ef_co2e: parseFloat(form.ef_co2e),
      ef_co2: form.ef_co2 ? parseFloat(form.ef_co2) : undefined,
      ef_ch4: form.ef_ch4 ? parseFloat(form.ef_ch4) : undefined,
      ef_n2o: form.ef_n2o ? parseFloat(form.ef_n2o) : undefined,
      source: form.source || undefined, year_reference: parseInt(form.year_reference) || undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else {
      toast.success('Faktor kendaraan berhasil ditambahkan')
      setSuccess(true)
      setForm({ ...form, vehicle_type: '', ef_co2e: '', ef_co2: '', ef_ch4: '', ef_n2o: '' })
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
      <div className="lg:col-span-2 lg:sticky lg:top-6">
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <h3 className="text-lg font-extrabold text-ink tracking-tight mb-1">
            Kendaraan <span className="text-sage">(Jarak).</span>
          </h3>
          <p className="text-xs text-muted mb-5 leading-relaxed">
            Untuk kendaraan berdasarkan jarak tempuh (km/mile).
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Jenis Kendaraan <span className="text-sage-dark">*</span>
              </label>
              <input required placeholder="e.g. Passenger Car - Petrol" value={form.vehicle_type} onChange={(e) => s('vehicle_type', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">Satuan</label>
              <div className="flex gap-1 bg-canvas border border-border p-1 rounded-full">
                {(['km', 'mile'] as const).map((u) => (
                  <button key={u} type="button" onClick={() => setForm((f) => ({ ...f, unit: u }))}
                    className={`flex-1 py-1.5 text-xs rounded-full font-semibold transition-all ${form.unit === u ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink'}`}>{u}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5 block">
                kg CO₂e per {form.unit} <span className="text-sage-dark">*</span>
              </label>
              <input required type="text" inputMode="decimal" placeholder="0.12345" value={form.ef_co2e} onChange={(e) => s('ef_co2e', e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all" />
            </div>

            <div className="bg-canvas rounded-xl p-4 border border-border">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-2">Raw Gas Factors <span className="text-muted font-normal">(opsional)</span></p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[['ef_co2', 'CO₂'], ['ef_ch4', 'CH₄'], ['ef_n2o', 'N₂O']].map(([k, l]) => (
                  <div key={k}>
                    <label className="text-[10px] font-semibold text-ink mb-1 block">{l}</label>
                    <input type="text" inputMode="decimal" placeholder="0" value={form[k as keyof typeof form]} onChange={(e) => s(k, e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface border border-border rounded-md text-xs text-ink font-mono focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/20 transition-all" />
                  </div>
                ))}
              </div>
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
        <MasterTable rows={rows} onDeactivate={deactivateVehicleFactor}
          editTable="ef_vehicle" editTitle="Vehicle Factor"
          editFields={[
            { key: 'vehicle_type', label: 'Jenis Kendaraan', type: 'text' },
            { key: 'unit', label: 'Satuan', type: 'select', options: ['km', 'mile'] },
            { key: 'ef_co2e', label: 'kg CO₂e/unit', type: 'number' },
            { key: 'ef_co2', label: 'CO₂ (kg)', type: 'number' },
            { key: 'ef_ch4', label: 'CH₄ (kg)', type: 'number' },
            { key: 'ef_n2o', label: 'N₂O (kg)', type: 'number' },
            { key: 'source', label: 'Sumber', type: 'text' },
            { key: 'year_reference', label: 'Tahun', type: 'number' },
          ]}
          columns={[
            { key: 'vehicle_type', label: 'Jenis Kendaraan' },
            { key: 'unit', label: 'Satuan' },
            { key: 'ef_co2e', label: 'kg CO₂e/unit', render: (r) => <span className="font-mono">{r.ef_co2e}</span> },
            { key: 'source', label: 'Sumber', render: (r) => <span className="text-muted text-[11px]">{r.source ?? '—'}{r.year_reference ? ` · ${r.year_reference}` : ''}</span> },
          ]}
          emptyText="Belum ada faktor kendaraan."
        />
      </div>
    </div>
  )
}