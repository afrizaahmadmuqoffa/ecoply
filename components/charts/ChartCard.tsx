type Props = {
  title: string
  subtitle?: string
  /** Lebar default: full. Tambahkan className untuk ukuran custom. */
  className?: string
  children: React.ReactNode
}

/** Panel konsisten untuk grafik/visualisasi. Server component. */
export default function ChartCard({ title, subtitle, className = '', children }: Props) {
  return (
    <div
      className={`bg-surface border border-border rounded-[18px] p-5 sm:p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)] ${className}`}
    >
      <div className="mb-5">
        <h3 className="text-sm font-bold text-ink tracking-tight">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-xs text-muted leading-relaxed">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}