'use client'

import Link from 'next/link'
import { ArrowRight, Building2, Check, Clock, RefreshCw, X } from 'lucide-react'

type Request = {
  id: string
  entity_type: 'company' | 'recycler'
  entity_id: string
  status: string
  note: string | null
  created_at: string
  reviewed_at: string | null
}

type Entity = {
  id: string
  name: string
  type: 'company' | 'recycler'
  contactName?: string | null
  email?: string | null
  industry?: string | null
  segment?: string | null
  address?: string | null
  npwp?: string | null
  nik?: string | null
  capacity_kg_per_month?: number | null
  certifications?: { name: string; file_url: string }[] | null
  created_at?: string | null
  recycler_details?: {
    accepted_materials?: string[] | null
    capacity_per_month?: number | null
    service_radius_km?: number | null
    certifications?: { name: string; file_url: string }[] | null
    is_active?: boolean | null
  } | null
}

type Props = {
  request: Request
  entity?: Entity
  readonly?: boolean
  selected?: boolean
  onToggle?: (requestId: string) => void
}

const statusConfig: Record<string, { label: string; classes: string; iconBg: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Menunggu',
    classes: 'text-amber-700 bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    icon: <Clock className="w-2.5 h-2.5" strokeWidth={3} />,
  },
  verified: {
    label: 'Terverifikasi',
    classes: 'text-sage-dark bg-mint border-sage/30',
    iconBg: 'bg-sage/20 text-sage-dark',
    icon: <Check className="w-2.5 h-2.5" strokeWidth={3} />,
  },
  rejected: {
    label: 'Ditolak',
    classes: 'text-red-700 bg-red-50 border-red-200',
    iconBg: 'bg-red-100 text-red-700',
    icon: <X className="w-2.5 h-2.5" strokeWidth={3} />,
  },
}

const segmentLabel: Record<string, string> = {
  umkm: 'UMKM',
  non_umkm: 'Menengah & Besar',
}

const entityIcons = {
  company: <Building2 className="w-5 h-5" strokeWidth={1.8} />,
  recycler: <RefreshCw className="w-5 h-5" strokeWidth={1.8} />,
}

export default function VerificationCard({
  request,
  entity,
  readonly = false,
  selected = false,
  onToggle,
}: Props) {
  const status = statusConfig[request.status] ?? statusConfig.pending

  return (
    <div
      className={`group flex items-center gap-4 bg-surface border rounded-[18px] px-5 py-4 transition-all shadow-[0_4px_12px_-8px_rgba(11,31,22,0.04)] ${
        selected
          ? 'border-sage ring-4 ring-sage/10 shadow-[0_12px_24px_-12px_rgba(85,158,123,0.24)]'
          : readonly
            ? 'border-border opacity-85'
            : 'border-border hover:border-sage/40 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-16px_rgba(11,31,22,0.12)]'
      }`}
    >
      {/* Checkbox seleksi (kiri) */}
      {!readonly && onToggle ? (
        <label className="relative inline-flex items-center justify-center flex-shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(request.id)}
            className="peer sr-only"
            aria-label={`Pilih ${entity?.name ?? request.entity_id}`}
          />
          <span className="w-5 h-5 rounded-md border-2 border-border bg-surface peer-checked:bg-sage peer-checked:border-sage transition-colors flex items-center justify-center">
            {selected && (
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            )}
          </span>
        </label>
      ) : (
        <span className="w-5 flex-shrink-0" />
      )}

      {/* Icon tile */}
      <span className="w-11 h-11 rounded-xl bg-mint text-sage-dark flex items-center justify-center flex-shrink-0">
        {entityIcons[request.entity_type]}
      </span>

      {/* Nama entitas → klik = navigasi ke detail profile */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/admin/verification/${request.entity_id}`}
          className="group/link inline-flex items-center gap-1.5 text-sm font-bold text-ink hover:text-sage-dark tracking-tight truncate max-w-full"
        >
          <span className="truncate">{entity?.name ?? '—'}</span>
          <ArrowRight
            className="w-3.5 h-3.5 flex-shrink-0 opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all"
            strokeWidth={2.5}
          />
        </Link>
        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted">
          <span className="font-medium">
            {request.entity_type === 'company' ? 'Perusahaan' : 'Recycler'}
          </span>
          {entity?.segment && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-mint text-sage-dark text-[10px] font-bold uppercase tracking-wider">
              {segmentLabel[entity.segment] ?? entity.segment}
            </span>
          )}
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {new Date(request.created_at).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Status badge */}
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${status.classes}`}
      >
        <span className={`w-4 h-4 rounded-full flex items-center justify-center ${status.iconBg}`}>
          {status.icon}
        </span>
        {status.label}
      </span>
    </div>
  )
}