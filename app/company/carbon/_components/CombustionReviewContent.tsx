/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import ReviewPageLayout from './ReviewPageLayout'
import SnapshotBreakdown from './SnapshotBreakdown'
import EditCombustionForm from './EditCombustionForm'
import EditModal from './EditModal'
import { BarChart3, MessageSquare } from 'lucide-react'

function fmt(kg: number | null) {
  if (kg === null) return '—'
  const t = kg / 1000
  return t >= 1000 ? `${(t / 1000).toFixed(3)} ktCO₂e` : `${t.toFixed(4)} tCO₂e`
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-canvas border border-border rounded-xl px-4 py-3">
      <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">{label}</p>
      <p className="text-sm font-bold text-ink tracking-tight mt-1 break-words">{value}</p>
    </div>
  )
}

function formatPeriod(start: string, end: string) {
  const s = new Date(start).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
  const e = new Date(end).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
  return s === e ? s : `${s} — ${e}`
}

type Props = {
  entry: any
  scopeLabel: string
  scopeFactors: any[]
}

export default function CombustionReviewContent({ entry, scopeLabel, scopeFactors }: Props) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <>
      <ReviewPageLayout
        title={`${entry.fuel_name} — ${scopeLabel}`}
        subtitle={`Scope 1 Combustion · ${entry.quantity} ${entry.unit}`}
        status={entry.status}
        id={entry.id}
        type="combustion"
        onEdit={entry.status === 'draft' ? () => setIsEditing(true) : undefined}
        metadata={{
          scope: 'Scope 1',
          type: scopeLabel,
          quantity: `${entry.quantity.toLocaleString('id-ID')} ${entry.unit}`,
          period: formatPeriod(entry.period_start, entry.period_end),
          createdAt: entry.created_at,
        }}
      >
        {/* Main Info Cards */}
        <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark">
              Informasi Entri
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <InfoCard label="Jenis" value={scopeLabel} />
            <InfoCard label="Bahan Bakar" value={entry.fuel_name} />
            <InfoCard label="Jumlah" value={`${entry.quantity.toLocaleString('id-ID')} ${entry.unit}`} />
            <InfoCard label="Periode" value={formatPeriod(entry.period_start, entry.period_end)} />
          </div>
        </div>

        {/* Hasil Kalkulasi */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-[18px] p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" strokeWidth={1.8} />
            </span>
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-800">
              Hasil Kalkulasi
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-amber-800/70">Scope 1 CO₂e</p>
              <p className="text-lg font-extrabold text-amber-800 tracking-tight mt-1">{fmt(entry.emission_scope1_co2e)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-amber-800/70">Outside Scope CO₂e</p>
              <p className="text-lg font-extrabold text-muted tracking-tight mt-1">{fmt(entry.emission_outside_scope_co2e)}</p>
            </div>
          </div>
        </div>

        <SnapshotBreakdown snapshot={entry.ef_snapshot} />

        {entry.notes && (
          <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-muted" strokeWidth={2} />
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">Catatan</span>
            </div>
            <p className="text-sm text-ink leading-relaxed">{entry.notes}</p>
          </div>
        )}
      </ReviewPageLayout>

      {entry.status === 'draft' && (
        <EditModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          title={`Edit Draft — ${entry.fuel_name}`}
          subtitle={`${scopeLabel} · ${entry.quantity} ${entry.unit}`}
        >
          <EditCombustionForm
            id={entry.id}
            scopeCategory={entry.scope_category as 'stationary' | 'mobile'}
            factors={scopeFactors}
            onSaved={() => setIsEditing(false)}
            initial={{
              ef_combustion_id: entry.ef_combustion_id,
              fuel_name: entry.fuel_name,
              unit: entry.unit,
              quantity: entry.quantity,
              period_start: entry.period_start,
              period_end: entry.period_end,
              notes: entry.notes,
            }}
          />
        </EditModal>
      )}
    </>
  )
}