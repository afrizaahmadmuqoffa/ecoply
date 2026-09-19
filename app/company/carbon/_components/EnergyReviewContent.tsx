/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import ReviewPageLayout from './ReviewPageLayout'
import SnapshotBreakdown from './SnapshotBreakdown'
import EditEnergyForm from './EditEnergyForm'
import EditModal from './EditModal'
import { MessageSquare } from 'lucide-react'

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
  gridFactors: any[]
  typeLabel: string
  regionLabel: string
}

export default function EnergyReviewContent({ entry, gridFactors, typeLabel, regionLabel }: Props) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <>
      <ReviewPageLayout
        title={`${typeLabel}${regionLabel}`}
        subtitle={`Scope 2 Energy · ${entry.consumption.toLocaleString('id-ID')} ${entry.unit}`}
        status={entry.status}
        id={entry.id}
        type="energy"
        onEdit={entry.status === 'draft' ? () => setIsEditing(true) : undefined}
        metadata={{
          scope: 'Scope 2',
          type: typeLabel,
          quantity: `${entry.consumption.toLocaleString('id-ID')} ${entry.unit}`,
          period: formatPeriod(entry.period_start, entry.period_end),
          createdAt: entry.created_at,
        }}
      >
        <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark">
              Informasi Entri
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <InfoCard label="Jenis Energi" value={typeLabel} />
            <InfoCard label="Wilayah" value={entry.region_name ?? '—'} />
            <InfoCard label="Konsumsi" value={`${entry.consumption.toLocaleString('id-ID')} ${entry.unit}`} />
            <InfoCard label="Periode" value={formatPeriod(entry.period_start, entry.period_end)} />
            <InfoCard label="Custom EF" value={entry.use_custom_ef ? 'Ya' : 'Tidak'} />
            <InfoCard label="Emisi CO₂e" value={fmt(entry.emission_co2e)} />
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
          title={`Edit Draft — ${typeLabel}`}
          subtitle={`${entry.consumption.toLocaleString('id-ID')} ${entry.unit}`}
        >
          <EditEnergyForm
            id={entry.id}
            gridFactors={gridFactors}
            onSaved={() => setIsEditing(false)}
            initial={{
              energy_type: entry.energy_type as 'electricity' | 'steam',
              grid_ef_id: entry.grid_ef_id,
              region_name: entry.region_name,
              unit: entry.unit as 'kWh' | 'MWh' | 'MMBtu',
              consumption: entry.consumption,
              use_custom_ef: entry.use_custom_ef,
              custom_ef_kg_co2e: entry.custom_ef_kg_co2e,
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