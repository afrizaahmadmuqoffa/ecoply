// ── Chart data aggregation helpers (pure TS) ────────────────

/** Daftar N label bulan terakhir dalam format 'YYYY-MM', diurutkan lama → baru. */
export function lastMonths(n: number, from: Date = new Date()): string[] {
  const out: string[] = []
  const d = new Date(from.getFullYear(), from.getMonth(), 1)
  for (let i = 0; i < n; i++) {
    out.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() - 1)
  }
  return out
}

/** Ambil kunci bulan 'YYYY-MM' dari timestamp / tanggal string ISO (null → '' yang diabaikan bucketSum). */
export function monthKey(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 7)
}

/**
 * Bucket-kan nilai per bulan, zero-filled sesuai daftar `months`.
 * rows: { month: string; value: number }[]
 */
export function bucketSum(
  rows: Array<{ month: string; value: number }>,
  months: string[],
): number[] {
  const acc = new Map(months.map((m) => [m, 0]))
  for (const r of rows) {
    const has = acc.get(r.month)
    if (has !== undefined) acc.set(r.month, has + r.value)
  }
  return months.map((m) => acc.get(m) ?? 0)
}

type CaEntry = {
  month: string
  value: number
}

/** Pisahkan entri carbon aktivitas menjadi 3 array per scope (kg CO2e). */
export function splitCarbonScopes(input: {
  combustion: CaEntry[]
  vehicle: CaEntry[]
  fugitive: CaEntry[]
  energy: CaEntry[]
  s3c1: CaEntry[]
  s3c2: CaEntry[]
}): { scope1: CaEntry[]; scope2: CaEntry[]; scope3: CaEntry[] } {
  return {
    scope1: [
      ...input.combustion,
      ...input.vehicle,
      ...input.fugitive,
    ],
    scope2: input.energy,
    scope3: [...input.s3c1, ...input.s3c2],
  }
}

/** Build series object siap-pakai recharts dari scope buckets. */
export function buildScopeSeries(
  scopes: { scope1: CaEntry[]; scope2: CaEntry[]; scope3: CaEntry[] },
  months: string[],
  options?: { withOutside?: CaEntry[] },
): Array<{ name: string; color: string; data: number[] }> {
  const series = [
    { name: 'Scope 1', color: '#f97316', data: bucketSum(scopes.scope1, months) },
    { name: 'Scope 2', color: '#3b82f6', data: bucketSum(scopes.scope2, months) },
    { name: 'Scope 3', color: '#a855f7', data: bucketSum(scopes.scope3, months) },
  ]
  if (options?.withOutside) {
    series.push({
      name: 'Outside Scope',
      color: '#9ca3af',
      data: bucketSum(options.withOutside, months),
    })
  }
  return series
}

/** Top-N berdasarkan nilai, desc. */
export function topCategories(
  rows: Array<{ label: string; value: number }>,
  n = 5,
): Array<{ label: string; value: number }> {
  return [...rows]
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
    .filter((r) => r.value > 0)
}

/** kg → string ton CO2e ringkas ('12.4 t' / '1.2 kt'). */
export function fmtMgToTco2e(kg: number): string {
  const t = kg / 1000
  if (!isFinite(t)) return '0 t'
  if (Math.abs(t) >= 1000) return `${(t / 1000).toFixed(2)} kt`
  return `${t.toFixed(1)} t`
}

/** kg → string ringkas dengan satuan ribuan. */
export function fmtKg(value: number): string {
  if (!isFinite(value)) return '0 kg'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} t`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k kg`
  return `${Math.round(value).toLocaleString('id-ID')} kg`
}