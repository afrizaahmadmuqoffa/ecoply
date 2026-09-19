'use client'

import { useCarbonUnit } from './CarbonUnitProvider'
import { formatCarbon } from '@/lib/carbon-units'

type Props = {
  kg: number
  className?: string
  valueClassName?: string
  unitClassName?: string
}

/** Nilai emisi karbon dalam satuan aktif (tCO2e / kgCO2e). */
export default function CarbonAmount({
  kg,
  className = '',
  valueClassName = '',
  unitClassName = 'text-xs font-medium text-muted',
}: Props) {
  const { unit } = useCarbonUnit()
  const { value, unitLabel } = formatCarbon(kg ?? 0, unit)

  return (
    <span className={className}>
      <span className={valueClassName}>{value}</span>{' '}
      <span className={unitClassName}>{unitLabel}</span>
    </span>
  )
}