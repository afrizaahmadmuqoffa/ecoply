'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'

export type Segment = { label: string; value: number; color: string }

type Props = {
  segments: Segment[]
  height?: number
  centerLabel?: string
  centerValue?: string
  formatValue?: (v: number) => string
}

/** Donut chart dengan center total + legenda kecil di samping. */
export default function DonutChart({
  segments,
  height = 240,
  centerLabel = 'Total',
  centerValue,
  formatValue = (v) => v.toLocaleString('id-ID'),
}: Props) {
  const filtered = segments.filter((s) => s.value > 0)
  const total = filtered.reduce((a, s) => a + s.value, 0)

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-44 text-center">
        <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center mb-3">
          <PieChartIcon className="w-5 h-5 text-muted" strokeWidth={1.8} />
        </div>
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-0.5">
          Tidak Ada Data
        </p>
        <p className="text-xs text-muted">Belum ada distribusi untuk ditampilkan</p>
      </div>
    )
  }

  const data = filtered.map((s) => ({ name: s.label, value: s.value }))

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-5">
      <div
        style={{ height }}
        className="relative w-full max-w-[220px] flex-shrink-0 sm:w-[58%] sm:max-w-none"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={2.5}
              strokeWidth={0}
            >
              {data.map((entry) => {
                const seg = filtered.find((s) => s.label === entry.name)!
                return <Cell key={entry.name} fill={seg.color} />
              })}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatValue(Number(value ?? 0)), String(name)]}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #E2E8DF',
                fontSize: 12,
                background: '#FFFFFF',
                boxShadow: '0 12px 24px -12px rgba(11,31,22,0.12)',
                padding: '8px 12px',
              }}
              labelStyle={{ color: '#0B1F16', fontWeight: 700 }}
              itemStyle={{ color: '#5D6B61' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
            {centerLabel}
          </span>
          <span className="text-2xl font-extrabold text-ink tracking-tight mt-0.5">
            {centerValue ?? formatValue(total)}
          </span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2.5 sm:w-auto sm:flex-1">
        {filtered.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-canvas"
                style={{ background: s.color }}
              />
              <span className="text-muted truncate">{s.label}</span>
            </span>
            <span className="text-ink font-semibold text-right tabular-nums flex-shrink-0">
              {formatValue(s.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}