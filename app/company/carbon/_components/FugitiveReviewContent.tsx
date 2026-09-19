/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import ReviewPageLayout from './ReviewPageLayout'
import SnapshotBreakdown from './SnapshotBreakdown'
import EditFugitiveForm from './EditFugitiveForm'
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
  refrigerants: any[]
  assetCategories: any[]
  methodLabel: string
}

export default function FugitiveReviewContent({ entry, refrigerants, assetCategories, methodLabel }: Props) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <>
      <ReviewPageLayout
        title={`${entry.refrigerant_name} (${methodLabel})`}
        subtitle={`Scope 1 Fugitive · ${methodLabel} Method`}
        status={entry.status}
        id={entry.id}
        type="fugitive"
        onEdit={entry.status === 'draft' ? () => setIsEditing(true) : undefined}
        metadata={{
          scope: 'Scope 1',
          type: `Fugitive · ${methodLabel}`,
          quantity: entry.method === 'top_up'
            ? `${entry.mass_refilled_kg ?? 0} kg`
            : `${entry.total_capacity_kg ?? 0} kg`,
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
            <InfoCard label="Refrigeran" value={entry.refrigerant_name} />
            <InfoCard label="Metode" value={methodLabel} />
            {entry.method === 'top_up' ? (
              <>
                <InfoCard label="Massa Diisi Ulang" value={`${entry.mass_refilled_kg ?? 0} kg`} />
                <InfoCard label="GWP" value={entry.gwp_value?.toLocaleString('id-ID') ?? '—'} />
              </>
            ) : (
              <>
                <InfoCard label="Kategori Aset" value={entry.asset_category_name ?? '—'} />
                <InfoCard label="Kapasitas Total" value={`${entry.total_capacity_kg ?? 0} kg`} />
                <InfoCard label="Leakage Rate" value={`${((entry.leakage_rate ?? 0) * 100).toFixed(2)}%`} />
                <InfoCard label="GWP" value={entry.gwp_value?.toLocaleString('id-ID') ?? '—'} />
              </>
            )}
            <InfoCard label="Estimasi Leakage" value={`${entry.estimated_leakage_kg ?? 0} kg`} />
            <InfoCard label="Emisi CO₂e" value={fmt(entry.emission_co2e)} />
            <InfoCard label="Periode" value={formatPeriod(entry.period_start, entry.period_end)} />
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
          title={`Edit Draft — ${entry.refrigerant_name}`}
          subtitle={`${methodLabel} Method`}
        >
          <EditFugitiveForm
            id={entry.id}
            refrigerants={refrigerants}
            assetCategories={assetCategories}
            onSaved={() => setIsEditing(false)}
            initial={{
              method: entry.method as 'top_up' | 'screening',
              refrigerant_name: entry.refrigerant_name,
              refrigerant_gwp_id: entry.refrigerant_gwp_id,
              gwp_value: entry.gwp_value,
              mass_refilled_kg: entry.mass_refilled_kg,
              asset_category_id: entry.asset_category_id,
              asset_category_name: entry.asset_category_name,
              total_capacity_kg: entry.total_capacity_kg,
              leakage_rate: entry.leakage_rate,
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