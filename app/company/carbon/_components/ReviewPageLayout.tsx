import Link from 'next/link'
import type { ReactNode } from 'react'
import ReviewActions from './ReviewActions'
import { ArrowLeft, BadgeCheck, Check, ChevronRight, Info, Pencil, X, FileText } from 'lucide-react'

type ActivityType = 'combustion' | 'vehicle' | 'fugitive' | 'energy' | 's3c1' | 's3c2'

type Metadata = {
  scope?: string        // "Scope 1", "Scope 2", "Scope 3 Cat 1"
  type?: string         // "Stationary Combustion", "Mobile", etc
  quantity?: string     // "500 liter"
  period?: string       // "Jan 2026 — Feb 2026"
  createdAt?: string    // ISO string
}

type Props = {
  title: string
  subtitle: string
  status: string
  id: string
  type: ActivityType
  children: ReactNode
  onEdit?: () => void
  metadata?: Metadata
}

const statusConfig: Record<string, {
  label: string
  classes: string
  heroBg: string
  icon: React.ReactNode
}> = {
  draft: {
    label: 'Draft',
    classes: 'text-amber-800 bg-amber-50 border-amber-200',
    heroBg: 'from-amber-50 to-amber-100/50',
    icon: (
      <FileText className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
  confirmed: {
    label: 'Confirmed',
    classes: 'text-sage-dark bg-mint border-sage/30',
    heroBg: 'from-mint to-sage/20',
    icon: (
      <Check className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
  rejected: {
    label: 'Rejected',
    classes: 'text-red-700 bg-red-50 border-red-200',
    heroBg: 'from-red-50 to-red-100/50',
    icon: (
      <X className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
}

const typeLabel: Record<ActivityType, string> = {
  combustion: 'Combustion',
  vehicle: 'Vehicle',
  fugitive: 'Fugitive',
  energy: 'Energy',
  s3c1: 'Scope 3 Cat 1',
  s3c2: 'Scope 3 Cat 2',
}

export default function ReviewPageLayout({
  title, subtitle, status, id, type, children, onEdit, metadata,
}: Props) {
  const s = statusConfig[status] ?? statusConfig.draft

  return (
    <div>
      {/* Top navigation */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <Link
          href="/company/carbon"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-sage-dark transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
          Kembali ke Carbon Accounting
        </Link>
        <nav className="flex items-center gap-2 text-xs text-muted">
          <Link href="/company/carbon" className="hover:text-sage-dark transition-colors">
            Carbon
          </Link>
          <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
          <span className="text-muted">{typeLabel[type]}</span>
          <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
          <span className="text-ink font-semibold truncate max-w-[240px]">{title}</span>
        </nav>
      </div>

      {/* Hero header */}
      <div className={`bg-gradient-to-br ${s.heroBg} border border-border rounded-[22px] p-6 sm:p-8 mb-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark mb-2">
              Detail Entri
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink tracking-tight leading-tight break-words">
              {title}
            </h1>
            <p className="text-sm text-muted mt-2">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="group inline-flex items-center gap-1.5 px-4 py-2 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)]"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
                Edit Draft
              </button>
            )}
            <span className={`inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full border ${s.classes}`}>
              {s.icon}
              {s.label}
            </span>
          </div>
        </div>
      </div>

      {/* 2 column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-8 space-y-5">
          {children}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
          {/* Review Actions */}
          <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center">
                <BadgeCheck className="w-4 h-4" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark">
                  Review Action
                </p>
                <p className="text-[11px] text-muted mt-0.5">Konfirmasi atau tolak entri ini</p>
              </div>
            </div>
            <ReviewActions id={id} type={type} status={status} />
          </div>

          {/* Metadata card */}
          <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-canvas text-muted flex items-center justify-center">
                <Info className="w-4 h-4" strokeWidth={2} />
              </span>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
                Metadata
              </p>
            </div>
            <dl className="space-y-2.5">
              {metadata?.scope && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[11px] text-muted">Scope</dt>
                  <dd className="text-xs font-bold text-ink">{metadata.scope}</dd>
                </div>
              )}
              {metadata?.type && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[11px] text-muted">Tipe</dt>
                  <dd className="text-xs font-bold text-ink">{metadata.type}</dd>
                </div>
              )}
              {metadata?.quantity && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[11px] text-muted">Jumlah</dt>
                  <dd className="text-xs font-mono font-bold text-ink">{metadata.quantity}</dd>
                </div>
              )}
              {metadata?.period && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[11px] text-muted">Periode</dt>
                  <dd className="text-xs font-bold text-ink">{metadata.period}</dd>
                </div>
              )}
              {metadata?.createdAt && (
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                  <dt className="text-[11px] text-muted">Dibuat</dt>
                  <dd className="text-xs text-muted tabular-nums">
                    {new Date(metadata.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Disclaimer card */}
          <div className="bg-canvas border border-border rounded-[18px] p-4">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-[11px] text-muted leading-relaxed">
                Konfirmasi entri akan memasukkannya ke perhitungan total emisi perusahaan.
                Pastikan data sudah akurat sebelum dikonfirmasi.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}