/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import ReviewPageLayout from './ReviewPageLayout'
import SnapshotBreakdown from './SnapshotBreakdown'
import EditVehicleForm from './EditVehicleForm'
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
  factors: any[]
}

export default function VehicleReviewContent({ entry, factors }: Props) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <>
      <ReviewPageLayout
        title={entry.vehicle_type}
        subtitle={`Scope 1 Vehicle · ${entry.distance.toLocaleString('id-ID')} ${entry.unit}`}
        status={entry.status}
        id={entry.id}
        type="vehicle"
        onEdit={entry.status === 'draft' ? () => setIsEditing(true) : undefined}
        metadata={{
          scope: 'Scope 1',
          type: 'Vehicle (Jarak)',
          quantity: `${entry.distance.toLocaleString('id-ID')} ${entry.unit}`,
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
            <InfoCard label="Jenis Kendaraan" value={entry.vehicle_type} />
            <InfoCard label="Jarak Tempuh" value={`${entry.distance.toLocaleString('id-ID')} ${entry.unit}`} />
            <InfoCard label="Periode" value={formatPeriod(entry.period_start, entry.period_end)} />
            <InfoCard label="Emisi" value={fmt(entry.emission_co2e)} />
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
          title={`Edit Draft — ${entry.vehicle_type}`}
          subtitle={`${entry.distance.toLocaleString('id-ID')} ${entry.unit}`}
        >
          <EditVehicleForm
            id={entry.id}
            factors={factors}
            onSaved={() => setIsEditing(false)}
            initial={{
              ef_vehicle_id: entry.ef_vehicle_id,
              vehicle_type: entry.vehicle_type,
              unit: entry.unit,
              distance: entry.distance,
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