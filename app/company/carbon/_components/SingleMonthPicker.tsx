'use client'

import { useEffect, useState } from 'react'

export type MonthRange = { period_start: string; period_end: string; label: string }

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

function monthRange(year: number, month: number): MonthRange {
  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${year}-${pad(month)}-01`
  const lastDay = new Date(year, month, 0).getDate()
  return {
    period_start: start,
    period_end: `${year}-${pad(month)}-${pad(lastDay)}`,
    label: `${MONTHS[month - 1]} ${year}`,
  }
}

type Props = {
  onChange: (range: MonthRange) => void
  disabled?: boolean
  /** Tanggal lama (YYYY-MM-DD) untuk menginisialisasi bulan/tahun. Default: bulan berjalan. */
  seedStart?: string
}

/** Pilih 1 bulan (Jan–Des + tahun). Output period_start = tgl 1, period_end = akhir bulan. */
export default function SingleMonthPicker({ onChange, disabled = false, seedStart }: Props) {
  const now = new Date()
  const seed = seedStart ? new Date(seedStart) : null
  const seedValid = seed && !isNaN(seed.getTime())
  const [year, setYear] = useState(seedValid ? seed.getFullYear() : now.getFullYear())
  const [month, setMonth] = useState(seedValid ? seed.getMonth() + 1 : now.getMonth() + 1)

  useEffect(() => {
    onChange(monthRange(year, month))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleYearChange(y: number) {
    setYear(y)
    onChange(monthRange(y, month))
  }

  function handleMonthChange(m: number) {
    setMonth(m)
    onChange(monthRange(year, m))
  }

  const years = [year - 1, year, year + 1]

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
          Bulan <span className="text-sage-dark">*</span>
        </label>
        <select
          value={month}
          onChange={(e) => handleMonthChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
        >
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
          Tahun <span className="text-sage-dark">*</span>
        </label>
        <select
          value={year}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  )
}