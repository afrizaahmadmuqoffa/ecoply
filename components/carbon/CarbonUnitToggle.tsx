'use client'

import { useCarbonUnit } from './CarbonUnitProvider'
import type { CarbonUnit } from '@/lib/carbon-units'

const OPTIONS: Array<{ value: CarbonUnit; label: string }> = [
  { value: 'tco2e', label: 'tCO2e' },
  { value: 'kgco2e', label: 'kgCO2e' },
]

/** Segmented control untuk switch satuan emisi (tCO2e / kgCO2e). */
export default function CarbonUnitToggle({ className }: { className?: string }) {
  const { unit, setUnit } = useCarbonUnit()

  return (
    <div
      role="group"
      aria-label="Satuan emisi karbon"
      className={`inline-flex items-center rounded-full bg-canvas border border-border p-0.5 text-xs ${
        className ?? ''
      }`}
    >
      {OPTIONS.map((opt) => {
        const active = unit === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => setUnit(opt.value)}
            className={`relative px-3 py-1.5 rounded-full font-semibold transition-all ${
              active
                ? 'bg-sage text-white shadow-[0_2px_6px_-2px_rgba(85,158,123,0.5)]'
                : 'text-muted hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}