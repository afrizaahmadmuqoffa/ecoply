import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ChartCard from '@/components/charts/ChartCard'
import MonthlyBarChart from '@/components/charts/MonthlyBarChart'
import ImpactAreaChart from '@/components/charts/ImpactAreaChart'
import DonutChart from '@/components/charts/DonutChart'
import CategoryBars from '@/components/charts/CategoryBars'
import CarbonAmount from '@/components/carbon/CarbonAmount'
import { CarbonUnitProvider } from '@/components/carbon/CarbonUnitProvider'
import CarbonUnitToggle from '@/components/carbon/CarbonUnitToggle'
import { ArrowRight, ChevronRight, Clock } from 'lucide-react'
import {
  lastMonths,
  monthKey,
  bucketSum,
  topCategories,
} from '@/lib/charts/aggregate'

type Snapshot = {
  ok: boolean
  error?: string
  bids_total: number
  bids_pending: number
  bids_accepted: number
  bids_declined: number
  manifests: number
  certificates: number
  co2e_avoided_kg: number
  weight_recycled_kg: number
  threads: number
}

type BidRow = { id: string; created_at: string | null; status: string | null }
type CertRow = { issued_at: string; co2e_avoided_kg: number | null; weight_kg: number | null; material_type: string }

export default async function RecyclerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: recycler } = await supabase
    .from('recyclers')
    .select('id, name, verification_status')
    .eq('user_id', user.id)
    .single()

  let s: Snapshot | null = null
  if (recycler?.id) {
    const { data: raw } = await supabase.rpc('recycler_dashboard_snapshot', {
      p_recycler: recycler.id,
    })
    if (raw && typeof raw === 'object' && (raw as { ok?: boolean }).ok === true) {
      s = raw as Snapshot
    }
  }

  const since = new Date()
  since.setFullYear(since.getFullYear() - 1)
  const sinceISO = since.toISOString()

  let bidData: BidRow[] = []
  let certRows: CertRow[] = []
  if (recycler?.id) {
    const { data: bids } = await supabase
      .from('marketplace_bids')
      .select('id, created_at, status')
      .eq('recycler_id', recycler.id)
      .gte('created_at', sinceISO)
      .limit(3000)
    bidData = bids ?? []

    const { data: manifests } = await supabase
      .from('manifests')
      .select('id')
      .in('bid_id', bidData.map((b) => b.id))
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

  const months = lastMonths(12)

  const bidTrend = [
    { name: 'Bid Diajukan', color: '#559E7B', data: bucketSum(bidData.map((b) => ({ month: monthKey(b.created_at), value: 1 })), months) },
    { name: 'Diterima', color: '#3F8263', data: bucketSum(bidData.filter((b) => b.status === 'accepted').map((b) => ({ month: monthKey(b.created_at), value: 1 })), months) },
  ]

  const statusCount = bidData.length > 0
    ? bidData.reduce<Record<string, number>>((acc, b) => {
        acc[b.status ?? ''] = (acc[b.status ?? ''] ?? 0) + 1
        return acc
      }, {})
    : { pending: s?.bids_pending ?? 0, accepted: s?.bids_accepted ?? 0, rejected: s?.bids_declined ?? 0 }

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

  const verification_status = recycler?.verification_status ?? 'pending'

  return (
    <CarbonUnitProvider>
      <div>
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
            Selamat datang{recycler?.name ? (
              <>, <span className="text-sage">{recycler.name}</span></>
            ) : null}.
          </h1>
          <p className="mt-3 text-sm text-muted max-w-xl">
            Ringkasan kinerja penawaran, transaksi, dan dampak daur ulang fasilitas Anda.
          </p>
        </div>

        {verification_status === 'pending' && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" strokeWidth={2} />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-900">Akun menunggu verifikasi</p>
              <p className="text-xs text-amber-800 mt-0.5">Admin sedang meninjau data fasilitas Anda.</p>
            </div>
          </div>
        )}

        {/* Hero ringkasan KPI */}
        <div className="bg-surface border border-border rounded-[18px] p-6 sm:p-8 mb-8 shadow-[0_24px_48px_-12px_rgba(11,31,22,0.08)]">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-muted">Kinerja 12 Bulan</p>
            <CarbonUnitToggle />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 sm:grid-cols-4">
            <div className="pb-4 border-b lg:border-b-0 lg:border-r border-border min-w-0">
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-2">CO2e Terhindar</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-sage-dark tracking-tight break-words">
                <CarbonAmount kg={s?.co2e_avoided_kg ?? 0} unitClassName="text-sm font-medium ml-1" />
              </p>
            </div>
            <div className="pb-4 border-b lg:border-b-0 lg:border-r border-border min-w-0">
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-2">Berat Didaur Ulang</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight break-words">
                {(s?.weight_recycled_kg ?? 0).toLocaleString('id-ID')} <span className="text-sm font-medium text-muted">kg</span>
              </p>
            </div>
            <div className="pb-4 border-b sm:border-b-0 sm:border-r border-border min-w-0">
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-2">Sertifikat</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                {s?.certificates ?? 0}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-2">Bid Diterima</p>
              <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${s && s.bids_pending > 0 ? 'text-amber-700' : 'text-ink'}`}>
                {s?.bids_accepted ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted">
                {s?.bids_pending ?? 0} menunggu · {s?.bids_declined ?? 0} ditolak
              </p>
              <Link
                href="/recycler/marketplace"
                className="text-xs text-sage-dark font-semibold mt-2 inline-flex items-center gap-1 hover:underline"
              >
                Buka marketplace
                <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>

        {/* Row 1: kinerja bid + aktivitas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <ChartCard title="Kinerja Bid" subtitle="Status seluruh penawaran Anda">
            <DonutChart
              segments={[
                { label: 'Diterima', value: statusCount.accepted ?? 0, color: '#559E7B' },
                { label: 'Menunggu', value: statusCount.pending ?? 0, color: '#EAB308' },
                { label: 'Ditolak', value: statusCount.rejected ?? 0, color: '#EF4444' },
                { label: 'Dibatalkan', value: statusCount.cancelled ?? 0, color: '#9CA3AF' },
              ]}
              centerLabel="Bid"
              centerValue={`${s?.bids_total ?? statusCount.accepted ?? 0}`}
            />
          </ChartCard>
          <ChartCard title="Aktivitas Bid" subtitle="Penawaran diajukan vs diterima per bulan" className="lg:col-span-2">
            <MonthlyBarChart labels={months} series={bidTrend} stacked={false} height={250} />
          </ChartCard>
        </div>

        {/* Row 2: dampak + material */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <ChartCard title="Dampak Daur Ulang" subtitle="CO2e terhindar & berat per bulan" className="lg:col-span-2">
            <ImpactAreaChart labels={months} series={impactSeries} height={250} />
          </ChartCard>
          <ChartCard title="Top Material Ditangani" subtitle="Berat (kg)">
            <CategoryBars rows={materialRows} suffix="kg" />
          </ChartCard>
        </div>

        {/* CTA bawah */}
        <div className="bg-gradient-to-br from-sage to-sage-dark border border-sage-dark rounded-[18px] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_24px_48px_-12px_rgba(11,31,22,0.24)]">
          <div>
            <p className="text-base font-bold text-white tracking-tight">Cari peluang daur ulang baru</p>
            <p className="text-sm text-white/80 mt-1">
              Temukan listing yang cocok dengan kapasitas dan material Anda.
            </p>
          </div>
          <Link
            href="/recycler/marketplace"
            className="group inline-flex items-center justify-center gap-2 bg-white hover:bg-mint text-sage-dark px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 flex-shrink-0 w-full sm:w-auto"
          >
            Jelajahi Marketplace
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </CarbonUnitProvider>
  )
}