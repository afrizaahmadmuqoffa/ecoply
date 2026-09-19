import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ChartCard from '@/components/charts/ChartCard'
import CarbonTrendChart from '@/components/charts/CarbonTrendChart'
import MonthlyBarChart from '@/components/charts/MonthlyBarChart'
import ImpactAreaChart from '@/components/charts/ImpactAreaChart'
import DonutChart from '@/components/charts/DonutChart'
import CategoryBars from '@/components/charts/CategoryBars'
import CarbonAmount from '@/components/carbon/CarbonAmount'
import { CarbonUnitProvider } from '@/components/carbon/CarbonUnitProvider'
import { ChevronRight, FileText } from 'lucide-react'
import {
  lastMonths,
  monthKey,
  bucketSum,
  splitCarbonScopes,
  buildScopeSeries,
  topCategories,
} from '@/lib/charts/aggregate'

type Snapshot = {
  ok: boolean
  error?: string
  companies_total: number
  companies_verified: number
  recyclers_total: number
  recyclers_verified: number
  vr_pending: number
  vr_rejected: number
  regulations_active: number
  listings_total: number
  listings_open: number
  listings_completed: number
  bids_pending: number
  bids_accepted: number
  threads: number
  messages: number
  manifests_total: number
  manifests_cert: number
  certificates: number
  co2e_avoided_kg: number
  weight_recycled_kg: number
  audits_done: number
  audits_inflight: number
  carbon_confirmed: number
  carbon_rejected: number
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const since = new Date()
  since.setFullYear(since.getFullYear() - 1)
  const sinceISO = since.toISOString()

  const [{ data: raw }, recentLogRes] = await Promise.all([
    supabase.rpc('admin_dashboard_snapshot'),
    supabase.from('audit_log').select('id, action, entity_type, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  let s: Snapshot | null = null
  if (raw && typeof raw === 'object' && (raw as { ok?: boolean }).ok === true) {
    s = raw as Snapshot
  }
  if (!s) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted mt-2">
          Gagal memuat ringkasan: {raw && typeof raw === 'object' ? (raw as { error?: string }).error ?? 'unknown' : 'empty'}.
        </p>
      </div>
    )
  }

  const [
    { data: companiesRows },
    { data: recyclersRows },
    { data: caComb },
    { data: caVeh },
    { data: caFug },
    { data: caEnergy },
    { data: caS3c1 },
    { data: caS3c2 },
    { data: listingsRows },
    { data: certRows },
  ] = await Promise.all([
    supabase.from('companies').select('created_at').gte('created_at', sinceISO).limit(2000),
    supabase.from('recyclers').select('created_at').gte('created_at', sinceISO).limit(2000),
    supabase.from('ca_combustion').select('period_start, emission_scope1_co2e, emission_outside_scope_co2e').eq('status', 'confirmed').gte('period_start', sinceISO.slice(0, 10)).limit(2000),
    supabase.from('ca_vehicle').select('period_start, emission_co2e').eq('status', 'confirmed').gte('period_start', sinceISO.slice(0, 10)).limit(2000),
    supabase.from('ca_fugitive').select('period_start, emission_co2e').eq('status', 'confirmed').gte('period_start', sinceISO.slice(0, 10)).limit(2000),
    supabase.from('ca_energy').select('period_start, emission_co2e').eq('status', 'confirmed').gte('period_start', sinceISO.slice(0, 10)).limit(2000),
    supabase.from('ca_s3c1').select('period_start, emission_co2e').eq('status', 'confirmed').gte('period_start', sinceISO.slice(0, 10)).limit(2000),
    supabase.from('ca_s3c2').select('period_start, emission_co2e').eq('status', 'confirmed').gte('period_start', sinceISO.slice(0, 10)).limit(2000),
    supabase.from('waste_listings').select('status').limit(5000),
    supabase.from('certificates').select('issued_at, co2e_avoided_kg, weight_kg, material_type').gte('issued_at', sinceISO).limit(2000),
  ])

  const months = lastMonths(12)

  const growthSeries = [
    { name: 'Perusahaan', color: '#559E7B', data: bucketSum((companiesRows ?? []).map((c) => ({ month: monthKey(c.created_at), value: 1 })), months) },
    { name: 'Recycler', color: '#3F8263', data: bucketSum((recyclersRows ?? []).map((r) => ({ month: monthKey(r.created_at), value: 1 })), months) },
  ]

  const scopes = splitCarbonScopes({
    combustion: (caComb ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_scope1_co2e ?? 0 })),
    vehicle: (caVeh ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_co2e ?? 0 })),
    fugitive: (caFug ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_co2e ?? 0 })),
    energy: (caEnergy ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_co2e ?? 0 })),
    s3c1: (caS3c1 ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_co2e ?? 0 })),
    s3c2: (caS3c2 ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_co2e ?? 0 })),
  })
  const outside = (caComb ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_outside_scope_co2e ?? 0 }))
  const scopeSeries = buildScopeSeries(scopes, months, { withOutside: outside })

  const certs = certRows ?? []
  const impactSeries = [
    { name: 'CO2e Terhindar', color: '#559E7B', unit: 'carbon' as const, data: bucketSum(certs.map((c) => ({ month: monthKey(c.issued_at), value: c.co2e_avoided_kg ?? 0 })), months) },
    { name: 'Berat Didaur Ulang', color: '#3F8263', unit: 'kg' as const, data: bucketSum(certs.map((c) => ({ month: monthKey(c.issued_at), value: c.weight_kg ?? 0 })), months) },
  ]

  const materialMap = new Map<string, number>()
  for (const c of certs) {
    const key = c.material_type || 'Lainnya'
    materialMap.set(key, (materialMap.get(key) ?? 0) + (c.weight_kg ?? 0))
  }
  const materialRows = topCategories(
    [...materialMap.entries()].map(([label, value]) => ({ label, value })),
    5,
  )

  const listingStatusCount = (listingsRows ?? []).reduce<Record<string, number>>((acc, l) => {
    acc[l.status ?? 'other'] = (acc[l.status ?? 'other'] ?? 0) + 1
    return acc
  }, {})

  const verifiedTotal = s.companies_verified + s.recyclers_verified

  const actionLabels: Record<string, string> = {
    'verification.approved': 'Menyetujui verifikasi',
    'verification.rejected': 'Menolak verifikasi',
    'verification.reopened': 'Membuka ulang verifikasi',
    'regulation.created': 'Membuat regulasi',
    'regulation.updated': 'Mengubah regulasi',
  }

  return (
    <CarbonUnitProvider>
      <div>
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
            Admin <span className="text-sage">Dashboard.</span>
          </h1>
          <p className="mt-3 text-sm text-muted max-w-xl">
            Konsolidasi seluruh aktivitas platform — entitas, emisi, marketplace, dan verifikasi.
          </p>
        </div>

        {/* Hero KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <Link href="/admin/ops" className="group min-w-0 bg-surface rounded-[18px] border border-border p-5 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.08)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-12px_rgba(11,31,22,0.12)] transition-all">
            <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted">CO2e Terhindar</p>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-sage-dark tracking-tight break-words">
              <CarbonAmount kg={s.co2e_avoided_kg} unitClassName="text-sm font-medium ml-1" />
            </p>
            <span className="text-xs text-sage-dark font-semibold mt-2 inline-flex items-center gap-1 group-hover:underline">
              Lihat detail
              <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
            </span>
          </Link>
          <div className="min-w-0 bg-surface rounded-[18px] border border-border p-5 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.08)]">
            <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted">Berat Didaur Ulang</p>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink tracking-tight break-words">
              {s.weight_recycled_kg.toLocaleString('id-ID')} <span className="text-sm font-medium text-muted">kg</span>
            </p>
          </div>
          <Link href="/admin/verification" className="group min-w-0 bg-surface rounded-[18px] border border-border p-5 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.08)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-12px_rgba(11,31,22,0.12)] transition-all">
            <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted">Entitas Terverifikasi</p>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">{verifiedTotal}</p>
            <p className="mt-1.5 text-xs text-muted">
              {s.companies_verified} perusahaan · {s.recyclers_verified} recycler
            </p>
            <span className="text-xs text-sage-dark font-semibold mt-2 inline-flex items-center gap-1 group-hover:underline">
              Kelola verifikasi
              <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
            </span>
          </Link>
          <Link href="/admin/verification" className="group min-w-0 bg-surface rounded-[18px] border border-border p-5 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.08)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-12px_rgba(11,31,22,0.12)] transition-all">
            <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted">Menunggu Verifikasi</p>
            <p className={`mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight ${s.vr_pending > 0 ? 'text-amber-700' : 'text-ink'}`}>
              {s.vr_pending}
            </p>
            <p className="mt-1.5 text-xs text-muted">{s.vr_rejected} ditolak</p>
            <span className="text-xs text-sage-dark font-semibold mt-2 inline-flex items-center gap-1 group-hover:underline">
              Review sekarang
              <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
            </span>
          </Link>
        </div>

        {/* Row 1: tren emisi + pipeline verifikasi */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <ChartCard title="Tren Emisi Dikonfirmasi" subtitle="Per bulan · Scope 1-3 + Outside Scope" className="lg:col-span-2">
            <CarbonTrendChart labels={months} series={scopeSeries} height={270} />
          </ChartCard>
          <ChartCard title="Pipeline Verifikasi" subtitle="Status seluruh entitas">
            <DonutChart
              segments={[
                { label: 'Terverifikasi', value: verifiedTotal, color: '#559E7B' },
                { label: 'Menunggu', value: s.vr_pending, color: '#EAB308' },
                { label: 'Ditolak', value: s.vr_rejected, color: '#EF4444' },
              ]}
              centerLabel="Entitas"
              centerValue={`${s.companies_total + s.recyclers_total}`}
            />
          </ChartCard>
        </div>

        {/* Row 2: pertumbuhan entitas + status listing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <ChartCard title="Pertumbuhan Entitas" subtitle="Perusahaan & recycler baru per bulan" className="lg:col-span-2">
            <MonthlyBarChart labels={months} series={growthSeries} stacked={false} height={250} />
          </ChartCard>
          <ChartCard title="Status Listing" subtitle="Distribusi listing marketplace">
            <DonutChart
              segments={[
                { label: 'Open', value: listingStatusCount.open ?? 0, color: '#559E7B' },
                { label: 'Dealing', value: listingStatusCount.dealing ?? 0, color: '#EAB308' },
                { label: 'Confirmed', value: listingStatusCount.confirmed ?? 0, color: '#3B82F6' },
                { label: 'Completed', value: listingStatusCount.completed ?? 0, color: '#3F8263' },
                { label: 'Cancelled', value: listingStatusCount.cancelled ?? 0, color: '#9CA3AF' },
              ]}
              centerLabel="Listing"
              centerValue={`${s.listings_total}`}
            />
          </ChartCard>
        </div>

        {/* Row 3: dampak daur ulang + material */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          <ChartCard title="Dampak Daur Ulang" subtitle="CO2e terhindar & berat daur ulang per bulan" className="lg:col-span-2">
            <ImpactAreaChart labels={months} series={impactSeries} height={260} />
          </ChartCard>
          <ChartCard title="Top Material Didaur Ulang" subtitle="Berat (kg) 12 bulan terakhir">
            <CategoryBars rows={materialRows} suffix="kg" />
          </ChartCard>
        </div>

        {/* Aktivitas terbaru */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark mb-1">
                02 — Recent Activity
              </span>
              <h2 className="text-xl font-bold text-ink tracking-tight">Aktivitas Platform Terbaru</h2>
            </div>
            <Link
              href="/admin/ops"
              className="text-xs text-sage-dark font-semibold inline-flex items-center gap-1 hover:underline"
            >
              Lihat semua log
              <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>
          <div className="bg-surface border border-border rounded-[18px] shadow-[0_12px_24px_-16px_rgba(11,31,22,0.08)] overflow-hidden">
            {recentLogRes.data && recentLogRes.data.length > 0 ? (
              <ul className="divide-y divide-border">
                {recentLogRes.data.map((entry) => (
                  <li key={entry.id} className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-canvas/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-2 h-2 rounded-full bg-sage flex-shrink-0" aria-hidden />
                      <span className="inline-block text-[10px] font-bold tracking-[0.12em] uppercase text-sage-dark bg-mint px-2 py-0.5 rounded flex-shrink-0">
                        {entry.entity_type || 'system'}
                      </span>
                      <span className="text-sm text-ink truncate font-medium">
                        {actionLabels[entry.action] ?? entry.action}
                      </span>
                    </div>
                    <span className="text-xs text-muted flex-shrink-0 font-mono tabular-nums">
                      {new Date(entry.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-muted" strokeWidth={1.8} />
                </div>
                <p className="text-sm text-muted">Belum ada aktivitas tercatat</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </CarbonUnitProvider>
  )
}