'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3 } from 'lucide-react'
import useMediaQuery from '@/lib/hooks/useMediaQuery'

export type Series = { name: string; color: string; data: number[] }

type Props = {
  labels: string[]
  series: Series[]
  height?: number
  stacked?: boolean
  formatValue?: (v: number) => string
}

const GRID_COLOR = '#E2E8DF'
const AXIS_COLOR = '#5D6B61'
const CURSOR_COLOR = '#EEF1EC'

/** Bar chart multi-serise per bulan (stacked atau grouped). */
export default function MonthlyBarChart({
  labels,
  series,
  height = 260,
  stacked = true,
  formatValue = (v) => v.toLocaleString('id-ID'),
}: Props) {
  const narrow = useMediaQuery('(max-width: 639px)')

  if (labels.length === 0 || series.every((s) => s.data.every((d) => d === 0))) {
    return (
      <div className="flex flex-col items-center justify-center h-44 text-center">
        <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center mb-3">
          <BarChart3 className="w-5 h-5 text-muted" strokeWidth={1.8} />
        </div>
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-0.5">
          Tidak Ada Data
        </p>
        <p className="text-xs text-muted">Belum ada data untuk periode ini</p>
      </div>
    )
  }

  const data = labels.map((label, i) => {
    const row: Record<string, number | string> = { label }
    for (const s of series) row[s.name] = s.data[i] ?? 0
    return row
  })

  return (
    <div style={{ width: '100%', height }} className="text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: AXIS_COLOR, fontSize: narrow ? 10 : 11 }}
            dy={8}
            interval="preserveStartEnd"
            minTickGap={narrow ? 12 : 24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: AXIS_COLOR, fontSize: narrow ? 10 : 11 }}
            tickFormatter={(v: number) => formatValue(v)}
            width={narrow ? 44 : 56}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value, name) => [formatValue(Number(value ?? 0)), String(name)]}
            cursor={{ fill: CURSOR_COLOR }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #E2E8DF',
              fontSize: 12,
              background: '#FFFFFF',
              boxShadow: '0 12px 24px -12px rgba(11,31,22,0.12)',
              padding: '10px 12px',
            }}
            labelStyle={{ color: '#0B1F16', fontWeight: 700, marginBottom: 4 }}
            itemStyle={{ color: '#5D6B61', padding: '2px 0' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{
              fontSize: 12,
              paddingTop: 12,
              paddingBottom: 4,
              color: '#5D6B61',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              columnGap: 18,
              rowGap: 6,
            }}
          />
          {series.map((s) => (
            <Bar
              key={s.name}
              dataKey={s.name}
              fill={s.color}
              stackId={stacked ? 'stack' : undefined}
              radius={stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}