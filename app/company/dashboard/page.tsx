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
import CarbonUnitToggle from '@/components/carbon/CarbonUnitToggle'
import {
  lastMonths,
  monthKey,
  bucketSum,
  splitCarbonScopes,
  buildScopeSeries,
  topCategories,
} from '@/lib/charts/aggregate'
import { AlertTriangle, ChevronRight, Clock, Leaf, Package, Recycle } from 'lucide-react'

function fmtImpact(value: number, unit: string) {
  if (value < 10) return `${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}${unit}`
  return `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}${unit}`
}

type Snapshot = {
  ok: boolean
  error?: string
  audits_total: number
  audits_done: number
  audits_failed: number
  carbon_confirmed: number
  carbon_drafts: number
  listings_total: number
  listings_open: number
  listings_completed: number
  bids_pending: number
  bids_accepted: number
  threads: number
  manifests: number
  certificates: number
  co2e_avoided_kg: number
  weight_recycled_kg: number
}

export default async function CompanyDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, verification_status')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) redirect('/company/profile')

  const since = new Date()
  since.setFullYear(since.getFullYear() - 1)
  const sinceISO = since.toISOString()

  const [{ data: company }, { data: raw }] = await Promise.all([
    supabase
      .from('companies')
      .select('name, verification_status')
      .eq('id', profile.company_id)
      .single(),
    supabase.rpc('company_dashboard_snapshot', { p_company: profile.company_id }),
  ])

  let s: Snapshot | null = null
  if (raw && typeof raw === 'object' && (raw as { ok?: boolean }).ok === true) {
    s = raw as Snapshot
  }

  const [
    { data: caComb },
    { data: caVeh },
    { data: caFug },
    { data: caEnergy },
    { data: caS3c1 },
    { data: caS3c2 },
    { data: auditRows },
    { data: listingRows },
  ] = await Promise.all([
    supabase.from('ca_combustion').select('period_start, emission_scope1_co2e, emission_outside_scope_co2e').eq('company_id', profile.company_id).eq('status', 'confirmed').gte('period_start', sinceISO.slice(0, 10)).limit(2000),
    supabase.from('ca_vehicle').select('period_start, emission_co2e').eq('company_id', profile.company_id).eq('status', 'confirmed').gte('period_start', sinceISO.slice(0, 10)).limit(2000),
    supabase.from('ca_fugitive').select('period_start, emission_co2e').eq('company_id', profile.company_id).eq('status', 'confirmed').gte('period_start', sinceISO.slice(0, 10)).limit(2000),
    supabase.from('ca_energy').select('period_start, emission_co2e').eq('company_id', profile.company_id).eq('status', 'confirmed').gte('period_start', sinceISO.slice(0, 10)).limit(2000),
    supabase.from('ca_s3c1').select('period_start, emission_co2e').eq('company_id', profile.company_id).eq('status', 'confirmed').gte('period_start', sinceISO.slice(0, 10)).limit(2000),
    supabase.from('ca_s3c2').select('period_start, emission_co2e').eq('company_id', profile.company_id).eq('status', 'confirmed').gte('period_start', sinceISO.slice(0, 10)).limit(2000),
    supabase.from('audit_jobs').select('status').eq('company_id', profile.company_id).limit(1000),
    supabase.from('waste_listings').select('id, created_at, status').eq('company_id', profile.company_id).gte('created_at', sinceISO).limit(2000),
  ])

  const months = lastMonths(12)

  const scopes = splitCarbonScopes({
    combustion: (caComb ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_scope1_co2e ?? 0 })),
    vehicle: (caVeh ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_co2e ?? 0 })),
    fugitive: (caFug ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_co2e ?? 0 })),
    energy: (caEnergy ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_co2e ?? 0 })),
    s3c1: (caS3c1 ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_co2e ?? 0 })),
    s3c2: (caS3c2 ?? []).map((c) => ({ month: monthKey(c.period_start), value: c.emission_co2e ?? 0 })),
  })
  const scopeSeries = buildScopeSeries(scopes, months)
  const totalEmissionsKg =
    scopeSeries.reduce((acc, se) => acc + se.data.reduce((a, b) => a + b, 0), 0)

  const listings = listingRows ?? []
  const listingIds = listings.map((l) => l.id)
  const listingTrend = [
    { name: 'Listing Dibuat', color: '#559E7B', data: bucketSum(listings.map((l) => ({ month: monthKey(l.created_at), value: 1 })), months) },
    { name: 'Selesai', color: '#3F8263', data: bucketSum(listings.filter((l) => l.status === 'completed').map((l) => ({ month: monthKey(l.created_at), value: 1 })), months) },
  ]

  // Bid masuk per bulan (dari listing milik company)
  let bidData: Array<{ created_at: string | null; status: string | null }> = []
  if (listingIds.length > 0) {
    const { data: bids } = await supabase
      .from('marketplace_bids')
      .select('created_at, status')
      .in('listing_id', listingIds)
      .gte('created_at', sinceISO)
      .limit(3000)
    bidData = bids ?? []
  }
  const bidTrend = [
    { name: 'Bid Masuk', color: '#7FB699', data: bucketSum(bidData.map((b) => ({ month: monthKey(b.created_at), value: 1 })), months) },
    { name: 'Diterima', color: '#3F8263', data: bucketSum(bidData.filter((b) => b.status === 'accepted').map((b) => ({ month: monthKey(b.created_at), value: 1 })), months) },
  ]

  // Sertifikat company (via manifest of listing)
  let certRows: Array<{ issued_at: string; co2e_avoided_kg: number | null; weight_kg: number | null; material_type: string }> = []
  if (listingIds.length > 0) {
    const { data: manifests } = await supabase
      .from('manifests')
      .select('id')
      .in('listing_id', listingIds)
      .limit(2000)
    const manifestIds = (manifests ?? []).map((m) => m.id)
    if (manifestIds.length > 0) {
      const { data: certs } = await supabase
        .from('certificates')
        .select('issued_at, co2e_avoided_kg, weight_kg, material_type')
        .in('manifest_id', manifestIds)
        .limit(2000)
      certRows = certs ?? []
    }
  }
  const impactSeries = [
    { name: 'CO2e Terhindar', color: '#559E7B', unit: 'carbon' as const, data: bucketSum(certRows.map((c) => ({ month: monthKey(c.issued_at), value: c.co2e_avoided_kg ?? 0 })), months) },
    { name: 'Berat Didaur Ulang', color: '#3F8263', unit: 'kg' as const, data: bucketSum(certRows.map((c) => ({ month: monthKey(c.issued_at), value: c.weight_kg ?? 0 })), months) },
  ]
  const materialMap = new Map<string, number>()
  for (const c of certRows) {
    const key = c.material_type || 'Lainnya'
    materialMap.set(key, (materialMap.get(key) ?? 0) + (c.weight_kg ?? 0))
  }
  const materialRows = topCategories(
    [...materialMap.entries()].map(([label, value]) => ({ label, value })),
    5,
  )

  const auditStatus = (auditRows ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})

  const verification_status = profile.verification_status ?? company?.verification_status ?? 'pending'

  return (
    <CarbonUnitProvider>
      <div>
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
            Selamat datang{company?.name ? (
              <>, <span className="text-sage">{company.name}</span></>
            ) : null}.
          </h1>
          <p className="mt-3 text-sm text-muted max-w-xl">
            Ringkasan emisi, aktivitas marketplace, dan dampak daur ulang perusahaan Anda.
          </p>
        </div>

        {verification_status === 'pending' && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" strokeWidth={2} />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-900">Akun menunggu verifikasi</p>
              <p className="text-xs text-amber-800 mt-0.5">Admin sedang meninjau data perusahaan Anda.</p>
            </div>
          </div>
        )}

        {/* Hero: total emisi */}
        <div className="bg-surface border border-border rounded-[18px] p-6 sm:p-8 mb-8 shadow-[0_24px_48px_-12px_rgba(11,31,22,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1 basis-72">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-muted">Total Emisi Terkonfirmasi</p>
                <CarbonUnitToggle className="shrink-0" />
              </div>
              <p className="mt-3">
                <CarbonAmount
                  kg={totalEmissionsKg}
                  valueClassName="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight"
                />
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {scopeSeries.map((se) => (
                  <span
                    key={se.name}
                    className="text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 font-semibold"
                    style={{ borderColor: se.color + '55', color: se.color, background: se.color + '14' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: se.color }} />
                    {se.name}:{' '}
                    <CarbonAmount
                      kg={se.data.reduce((a, b) => a + b, 0)}
                      className="whitespace-nowrap"
                      unitClassName="opacity-80 font-medium"
                    />
                  </span>
                ))}
              </div>
            </div>
            <Link
              href="/company/carbon"
              className="inline-flex items-center justify-center gap-2 border border-border bg-surface hover:border-sage text-ink hover:text-sage-dark px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap w-full sm:w-auto flex-shrink-0"
            >
              Lihat Data
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        {/* Ringkasan statistik */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Link
            href="/company/marketplace"
            className="group bg-surface border border-border rounded-[18px] p-4 flex items-center gap-3 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)] hover:border-sage/40 hover:shadow-[0_12px_24px_-12px_rgba(85,158,123,0.25)] transition-all"
          >
            <span className="w-10 h-10 rounded-xl bg-mint text-sage-dark flex items-center justify-center ring-4 ring-mint/20 flex-shrink-0">
              <Package className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Listing Aktif</p>
              <p className="text-lg font-extrabold text-sage-dark tracking-tight mt-0.5 tabular-nums">
                {s?.listings_open ?? 0}
              </p>
            </div>
          </Link>

          <Link
            href="/company/marketplace"
            className="group bg-surface border border-border rounded-[18px] p-4 flex items-center gap-3 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)] hover:border-sage/40 hover:shadow-[0_12px_24px_-12px_rgba(85,158,123,0.25)] transition-all"
          >
            <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center ring-4 ring-amber-50 flex-shrink-0">
              <Clock className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Bid Menunggu</p>
              <p className="text-lg font-extrabold text-amber-700 tracking-tight mt-0.5 tabular-nums">
                {s?.bids_pending ?? 0}
              </p>
            </div>
          </Link>

          <div className="bg-surface border border-border rounded-[18px] p-4 flex items-center gap-3 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <span className="w-10 h-10 rounded-xl bg-sage/15 text-sage-dark flex items-center justify-center ring-4 ring-sage/10 flex-shrink-0">
              <Leaf className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">CO2e Terhindar</p>
              <p className="text-lg font-extrabold text-sage-dark tracking-tight mt-0.5 tabular-nums">
                {fmtImpact((s?.co2e_avoided_kg ?? 0) / 1000, ' t')}
              </p>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-[18px] p-4 flex items-center gap-3 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center ring-4 ring-sky-50 flex-shrink-0">
              <Recycle className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">Berat Didaur Ulang</p>
              <p className="text-lg font-extrabold text-ink tracking-tight mt-0.5 tabular-nums">
                {fmtImpact(s?.weight_recycled_kg ?? 0, ' kg')}
              </p>
            </div>
          </div>
        </div>

        {s && s.carbon_drafts > 0 && (
          <div className="mb-8 bg-amber-50/60 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4" strokeWidth={2} />
            </span>
            <div className="flex-1">
              <p className="text-sm text-amber-900">
                <strong>{s.carbon_drafts} entri draft</strong> perlu dikonfirmasi agar masuk ke total emisi.
              </p>
              <Link href="/company/carbon" className="text-xs text-amber-800 font-semibold mt-1 inline-flex items-center gap-1 hover:underline">
                Review sekarang
                <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        )}

        {/* Row 1: tren emisi + audit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <ChartCard title="Emisi per Bulan" subtitle="Scope 1-3 terkonfirmasi · 12 bulan terakhir" className="lg:col-span-2">
            <CarbonTrendChart labels={months} series={scopeSeries} height={270} />
          </ChartCard>
          <ChartCard title="Status Audit" subtitle="Distribusi audit kepatuhan Anda">
            <DonutChart
              segments={[
                { label: 'Selesai', value: auditStatus.done ?? 0, color: '#559E7B' },
                { label: 'Proses', value: (auditStatus.queued ?? 0) + (auditStatus.processing ?? 0), color: '#EAB308' },
                { label: 'Gagal', value: auditStatus.failed ?? 0, color: '#EF4444' },
              ]}
              centerLabel="Audit"
              centerValue={`${s?.audits_total ?? 0}`}
            />
          </ChartCard>
        </div>

        {/* Row 2: marketplace + dampak */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <ChartCard title="Aktivitas Marketplace" subtitle="Listing & bid per bulan" className="lg:col-span-2">
            <MonthlyBarChart
              labels={months}
              series={[...listingTrend, ...bidTrend]}
              stacked={false}
              height={250}
            />
          </ChartCard>
          <ChartCard title="Top Material Didaur Ulang" subtitle="Berat (kg)">
            <CategoryBars rows={materialRows} suffix="kg" />
          </ChartCard>
        </div>

        {/* Row 3: dampak moneter lingkungan */}
        <ChartCard title="Dampak Daur Ulang" subtitle="CO2e terhindar & berat daur ulang per bulan">
          <ImpactAreaChart labels={months} series={impactSeries} height={240} />
        </ChartCard>
      </div>
    </CarbonUnitProvider>
  )
}