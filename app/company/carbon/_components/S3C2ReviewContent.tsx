/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import ReviewPageLayout from './ReviewPageLayout'
import SnapshotBreakdown from './SnapshotBreakdown'
import EditS3C2Form from './EditS3C2Form'
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
  avgFactors: any[]
  spendFactors: any[]
  methodLabel: string
  itemLabel: string
}

export default function S3C2ReviewContent({ entry, avgFactors, spendFactors, methodLabel, itemLabel }: Props) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <>
      <ReviewPageLayout
        title={itemLabel}
        subtitle={`Scope 3 Cat 2 · ${methodLabel} · ${entry.quantity.toLocaleString('id-ID')} ${entry.unit}`}
        status={entry.status}
        id={entry.id}
        type="s3c2"
        onEdit={entry.status === 'draft' ? () => setIsEditing(true) : undefined}
        metadata={{
          scope: 'Scope 3 · Cat 2',
          type: methodLabel,
          quantity: `${entry.quantity.toLocaleString('id-ID')} ${entry.unit}`,
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
            <InfoCard label="Metode" value={methodLabel} />
            {entry.method === 'supplier_specific' && (
              <>
                <InfoCard label="Supplier" value={entry.supplier_name ?? '—'} />
                <InfoCard label="Produk/Aset" value={entry.product_name ?? '—'} />
                <InfoCard label="EF Supplier" value={`${entry.supplier_ef_kg_co2e_per_unit ?? 0} kg CO₂e/${entry.unit}`} />
              </>
            )}
            {entry.method === 'average_data' && <InfoCard label="Jenis Aset" value={entry.material_name ?? '—'} />}
            {entry.method === 'spend_based' && (
              <>
                <InfoCard label="Sektor" value={entry.sector_name ?? '—'} />
                <InfoCard label="Mata Uang" value={entry.currency ?? '—'} />
              </>
            )}
            <InfoCard label="Jumlah" value={`${entry.quantity.toLocaleString('id-ID')} ${entry.unit}`} />
            <InfoCard label="Periode" value={formatPeriod(entry.period_start, entry.period_end)} />
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
          title={`Edit Draft — ${itemLabel}`}
          subtitle={`${methodLabel} · ${entry.quantity.toLocaleString('id-ID')} ${entry.unit}`}
        >
          <EditS3C2Form
            id={entry.id}
            avgFactors={avgFactors}
            spendFactors={spendFactors}
            onSaved={() => setIsEditing(false)}
            initial={{
              method: entry.method as 'supplier_specific' | 'average_data' | 'spend_based',
              supplier_name: entry.supplier_name,
              product_name: entry.product_name,
              supplier_ef_kg_co2e_per_unit: entry.supplier_ef_kg_co2e_per_unit,
              ef_average_id: entry.ef_average_id,
              material_name: entry.material_name,
              ef_spend_id: entry.ef_spend_id,
              sector_name: entry.sector_name,
              currency: entry.currency,
              quantity: entry.quantity,
              unit: entry.unit,
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