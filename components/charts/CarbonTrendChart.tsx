'use client'

import { useCarbonUnit } from '@/components/carbon/CarbonUnitProvider'
import { formatCarbon } from '@/lib/carbon-units'
import MonthlyBarChart, { type Series } from './MonthlyBarChart'

type Props = {
  labels: string[]
  series: Series[]
  height?: number
}

/** Grouped bar emisi per bulan — satuan mengikuti toggle (tCO2e / kgCO2e). */
export default function CarbonTrendChart({ labels, series, height = 260 }: Props) {
  const { unit } = useCarbonUnit()

  function fmt(v: number) {
    const f = formatCarbon(v, unit)
    return `${f.value} ${f.unitLabel}`
  }

  return (
    <MonthlyBarChart
      labels={labels}
      series={series}
      height={height}
      stacked={false}
      formatValue={fmt}
    />
  )
}