import { List } from 'lucide-react'

type Row = { label: string; value: number; color?: string }

type Props = {
  rows: Row[]
  max?: number
  total?: number
  formatValue?: (v: number) => string
  suffix?: string
  emptyText?: string
}

/** Bar list horizontal tanpa library (top-N kategori / material). */
export default function CategoryBars({
  rows,
  max,
  total,
  formatValue = (v) => v.toLocaleString('id-ID'),
  suffix = '',
  emptyText = 'Belum ada data',
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-44 text-center">
        <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center mb-3">
          <List className="w-5 h-5 text-muted" strokeWidth={1.8} />
        </div>
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-0.5">
          Tidak Ada Data
        </p>
        <p className="text-xs text-muted">{emptyText}</p>
      </div>
    )
  }

  const maxValue = max ?? Math.max(...rows.map((r) => r.value))
  const totalValue = total ?? rows.reduce((a, r) => a + r.value, 0)

  return (
    <ul className="space-y-4">
      {rows.map((r, idx) => {
        const pct = maxValue > 0 ? (r.value / maxValue) * 100 : 0
        const share = totalValue > 0 ? ((r.value / totalValue) * 100).toFixed(0) : '0'
        const fill = r.color ?? '#559E7B'
        return (
          <li key={r.label} className="text-xs">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-md bg-mint text-sage-dark flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-ink font-medium truncate">{r.label}</span>
              </span>
              <span className="text-ink font-semibold flex items-center gap-2 flex-shrink-0 tabular-nums">
                <span className="text-muted text-[11px]">{share}%</span>
                <span>
                  {formatValue(r.value)}
                  {suffix ? ` ${suffix}` : ''}
                </span>
              </span>
            </div>
            <div className="w-full h-2 bg-canvas rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  background: `linear-gradient(90deg, ${fill} 0%, ${fill}CC 100%)`,
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}