'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useCarbonUnit } from '@/components/carbon/CarbonUnitProvider'
import { formatCarbon } from '@/lib/carbon-units'
import { Activity } from 'lucide-react'
import useMediaQuery from '@/lib/hooks/useMediaQuery'

export type Series = {
  name: string
  color: string
  data: number[]
  /** 'carbon' → ditampilkan mengikuti unit tCO2e/kgCO2e; 'kg' → selalu kg (berat). */
  unit?: 'carbon' | 'kg'
}

type Props = {
  labels: string[]
  series: Series[]
  height?: number
}

type TooltipProps = {
  active?: boolean
  label?: string | number
  payload?: ReadonlyArray<{
    name?: string | number
    value?: unknown
    color?: string
  }>
}

const GRID_COLOR = '#E2E8DF'
const AXIS_COLOR = '#5D6B61'

function fmtKg(v: number) {
  return `${(isFinite(v) ? v : 0).toLocaleString('id-ID')} kg`
}

/** Area chart multi-serise per bulan dengan sumbu per-unit serise. */
export default function ImpactAreaChart({
  labels,
  series,
  height = 260,
}: Props) {
  const { unit } = useCarbonUnit()

  const hasCarbon = series.some((s) => s.unit === 'carbon')
  const hasWeight = series.some((s) => s.unit !== 'carbon')
  const narrow = useMediaQuery('(max-width: 639px)')

  if (labels.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-44 text-center">
        <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center mb-3">
          <Activity className="w-5 h-5 text-muted" strokeWidth={1.8} />
        </div>
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-0.5">
          Tidak Ada Data
        </p>
        <p className="text-xs text-muted">Belum ada data dampak untuk periode ini</p>
      </div>
    )
  }

  const data = labels.map((label, i) => {
    const row: Record<string, number | string> = { label }
    for (const s of series) row[s.name] = s.data[i] ?? 0
    return row
  })

  function carbonTick(v: number) {
    const f = formatCarbon(v, unit)
    return `${f.value} ${f.unitLabel}`
  }

  function renderTooltip(props: TooltipProps) {
    const { active, payload, label } = props
    if (!active || !payload || payload.length === 0) return null
    return (
      <div className="rounded-xl border border-border bg-surface px-3.5 py-3 text-xs shadow-[0_16px_32px_-12px_rgba(11,31,22,0.16)]">
        <p className="font-bold text-ink mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry) => {
            const def = series.find((s) => s.name === String(entry.name))
            const value = Number(entry.value ?? 0)
            const text =
              def?.unit === 'carbon'
                ? carbonTick(value)
                : fmtKg(value)
            return (
              <div key={String(entry.name)} className="flex items-center justify-between gap-4 py-0.5">
                <span className="flex items-center gap-2 text-muted">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: entry.color }}
                  />
                  <span className="truncate">{entry.name}</span>
                </span>
                <span className="font-semibold text-ink tabular-nums whitespace-nowrap">
                  {text}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height }} className="text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient
                key={s.name}
                id={`grad-${s.name.replace(/\s+/g, '-')}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
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
          {hasCarbon && (
            <YAxis
              yAxisId="carbon"
              orientation="left"
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS_COLOR, fontSize: narrow ? 10 : 11 }}
              tickFormatter={carbonTick}
              width={narrow ? 48 : 72}
            />
          )}
          {hasWeight && (
            <YAxis
              yAxisId="weight"
              orientation={hasCarbon ? 'right' : 'left'}
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS_COLOR, fontSize: narrow ? 10 : 11 }}
              tickFormatter={fmtKg}
              width={narrow ? 48 : 72}
            />
          )}
          <Tooltip content={renderTooltip} cursor={{ stroke: '#559E7B', strokeWidth: 1, strokeDasharray: '4 4' }} />
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
            <Area
              key={s.name}
              type="monotone"
              dataKey={s.name}
              yAxisId={s.unit === 'carbon' ? 'carbon' : 'weight'}
              stroke={s.color}
              strokeWidth={2.25}
              fill={`url(#grad-${s.name.replace(/\s+/g, '-')})`}
              connectNulls
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}