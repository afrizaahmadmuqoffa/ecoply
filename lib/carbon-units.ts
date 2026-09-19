export type CarbonUnit = 'tco2e' | 'kgco2e'

export const CARBON_UNIT_DEFAULT: CarbonUnit = 'tco2e'

/** Format nilai kg CO2e sesuai unit pilihan. Kembalikan nilai + label unit. */
export function formatCarbon(kg: number, unit: CarbonUnit): { value: string; unitLabel: string } {
  const safe = isFinite(kg) ? kg : 0
  if (unit === 'kgco2e') {
    return {
      value: safe.toLocaleString('id-ID', { maximumFractionDigits: 0 }),
      unitLabel: 'kgCO2e',
    }
  }
  return {
    value: (safe / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 }),
    unitLabel: 'tCO2e',
  }
}