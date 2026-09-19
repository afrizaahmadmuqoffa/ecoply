'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import MasterTable from '../MasterTable'
import { createRefrigerantGwp, deactivateRefrigerantGwp } from '@/lib/supabase/actions/carbon-master'

type Row = { id: string; refrigerant_name: string; gas_type: string; gwp_value: number; source: string | null; is_active: boolean }
const GAS_TYPES = ['HFC', 'PFC', 'SF6', 'NF3', 'HCFC', 'Other'] as const

export default function RefrigerantTab({ rows }: { rows: Row[] }) {
  const [form, setForm] = useState({ refrigerant_name: '', gas_type: 'HFC' as typeof GAS_TYPES[number], gwp_value: '', source: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const s = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    const result = await createRefrigerantGwp({ refrigerant_name: form.refrigerant_name, gas_type: form.gas_type, gwp_value: parseFloat(form.gwp_value), source: form.source || undefined })
    setLoading(false)
    if (result.error) { setError(result.error); toast.error(result.error) }
    else { toast.success('Refrigeran berhasil ditambahkan'); setSuccess(true); setForm({ ...form, refrigerant_name: '', gwp_value: '' }); setTimeout(() => setSuccess(false), 3000) }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Tambah GWP Refrigeran</h3>
        <p className="text-xs text-gray-400 mb-4">Nilai GWP 100 tahun (sudah sesuai basis IPCC yang digunakan sumber)</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Nama refrigeran (e.g. R-410A)" value={form.refrigerant_name} onChange={(e) => s('refrigerant_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <select value={form.gas_type} onChange={(e) => s('gas_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
            {GAS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">GWP Value (100yr) <span className="text-red-500">*</span></label>
            <input required type="text" inputMode="decimal" placeholder="e.g. 2088" value={form.gwp_value} onChange={(e) => s('gwp_value', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <input placeholder="Sumber (e.g. IPCC AR5, DEFRA 2024)" value={form.source} onChange={(e) => s('source', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg"><Check className="w-4 h-4" /> Berhasil</p>}
          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan'}</button>
        </form>
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
            { key: 'source', label: 'Sumber', render: (r) => <span className="text-gray-400">{r.source ?? '—'}</span> },
          ]} />
      </div>
    </div>
  )
}
