import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle, Inbox, Leaf } from 'lucide-react'
import CarbonInputModal from './_components/CarbonInputModal'
import ActivitySectionList, { type ActivityEntry, type ActivityType } from './_components/ActivitySectionList'

export default async function CompanyCarbonPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()
  const cid = profile?.company_id ?? ''

  const [
    { data: combustion },
    { data: vehicles },
    { data: fugitive },
    { data: energy },
    { data: s3c1 },
    { data: s3c2 },
    { data: combustionFactors },
    { data: vehicleFactors },
    { data: refrigerants },
    { data: fugitiveAssets },
    { data: gridFactors },
    { data: s3c1AvgFactors },
    { data: s3c1SpendFactors },
    { data: s3c2AvgFactors },
    { data: s3c2SpendFactors },
  ] = await Promise.all([
    supabase.from('ca_combustion').select('id, scope_category, fuel_name, unit, quantity, emission_scope1_co2e, emission_outside_scope_co2e, period_start, period_end, status, created_at').eq('company_id', cid).order('created_at', { ascending: false }).limit(200),
    supabase.from('ca_vehicle').select('id, vehicle_type, unit, distance, emission_co2e, period_start, period_end, status, created_at').eq('company_id', cid).order('created_at', { ascending: false }).limit(200),
    supabase.from('ca_fugitive').select('id, method, refrigerant_name, emission_co2e, period_start, period_end, status, created_at').eq('company_id', cid).order('created_at', { ascending: false }).limit(200),
    supabase.from('ca_energy').select('id, energy_type, region_name, unit, consumption, emission_co2e, period_start, period_end, status, created_at').eq('company_id', cid).order('created_at', { ascending: false }).limit(200),
    supabase.from('ca_s3c1').select('id, method, quantity, unit, emission_co2e, period_start, period_end, status, created_at, material_name, sector_name, supplier_name, product_name').eq('company_id', cid).order('created_at', { ascending: false }).limit(200),
    supabase.from('ca_s3c2').select('id, method, quantity, unit, emission_co2e, period_start, period_end, status, created_at, material_name, sector_name, supplier_name, product_name').eq('company_id', cid).order('created_at', { ascending: false }).limit(200),
    supabase.from('ef_combustion').select('id, scope_category, fuel_name, unit, ef_scope1_co2e, is_fossil').eq('is_active', true).order('scope_category').order('fuel_name'),
    supabase.from('ef_vehicle').select('id, vehicle_type, unit, ef_co2e').eq('is_active', true).order('vehicle_type'),
    supabase.from('refrigerant_gwp').select('id, refrigerant_name, gwp_value, gas_type').eq('is_active', true).order('refrigerant_name'),
    supabase.from('fugitive_asset_categories').select('id, category_name, annual_leakage_rate, typical_refrigerant').eq('is_active', true).order('category_name'),
    supabase.from('grid_emission_factors').select('id, region_name, energy_type, unit, ef_kg_co2e, method').eq('is_active', true).order('energy_type').order('region_name'),
    supabase.from('s3c1_average_factors').select('id, material_name, unit, ef_kg_co2e').eq('is_active', true).order('material_name'),
    supabase.from('s3c1_spend_factors').select('id, sector_name, currency, ef_kg_co2e').eq('is_active', true).order('sector_name'),
    supabase.from('s3c2_average_factors').select('id, material_name, unit, ef_kg_co2e').eq('is_active', true).order('material_name'),
    supabase.from('s3c2_spend_factors').select('id, sector_name, currency, ef_kg_co2e').eq('is_active', true).order('sector_name'),
  ])

  const pending =
    (combustion ?? []).filter(r => r.status === 'draft').length +
    (vehicles ?? []).filter(r => r.status === 'draft').length +
    (fugitive ?? []).filter(r => r.status === 'draft').length +
    (energy ?? []).filter(r => r.status === 'draft').length +
    (s3c1 ?? []).filter(r => r.status === 'draft').length +
    (s3c2 ?? []).filter(r => r.status === 'draft').length

  const hasAnyData =
    (combustion?.length ?? 0) > 0 ||
    (vehicles?.length ?? 0) > 0 ||
    (fugitive?.length ?? 0) > 0 ||
    (energy?.length ?? 0) > 0 ||
    (s3c1?.length ?? 0) > 0 ||
    (s3c2?.length ?? 0) > 0

  const inputModalProps = {
    combustionFactors: combustionFactors ?? [],
    vehicleFactors: vehicleFactors ?? [],
    refrigerants: refrigerants ?? [],
    fugitiveAssets: fugitiveAssets ?? [],
    gridFactors: gridFactors ?? [],
    s3c1AvgFactors: s3c1AvgFactors ?? [],
    s3c1SpendFactors: s3c1SpendFactors ?? [],
    s3c2AvgFactors: s3c2AvgFactors ?? [],
    s3c2SpendFactors: s3c2SpendFactors ?? [],
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
            Lacak <span className="text-sage">Emisi GRK.</span>
          </h1>
          <p className="mt-3 text-sm text-muted max-w-2xl">
            Input, hitung, dan kelola aktivitas emisi gas rumah kaca perusahaan per scope & kategori.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Suspense fallback={null}>
            <CarbonInputModal {...inputModalProps} />
          </Suspense>
        </div>
      </div>

      {pending > 0 && (
        <div className="mb-6 bg-amber-50/60 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              <span className="font-extrabold">{pending} entri</span> dalam status draft
            </p>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Perlu dikonfirmasi agar masuk ke total emisi.
            </p>
          </div>
        </div>
      )}

      {/* Activity sections */}
      {hasAnyData ? (
        <div className="space-y-5">
        <ActivitySection title="Scope 1 — Combustion" scope="S1" color="amber"
          entries={[
            ...(combustion ?? []).map(r => ({
              id: r.id, type: 'combustion' as ActivityType,
              label: `${r.fuel_name} (${r.scope_category})`,
              sub: `${r.quantity} ${r.unit}`,
              emission: r.emission_scope1_co2e,
              status: r.status,
              period: r.period_start,
              href: `/company/carbon/combustion/${r.id}`,
            })),
            ...(vehicles ?? []).map(r => ({
              id: r.id, type: 'vehicle' as ActivityType,
              label: r.vehicle_type,
              sub: `${r.distance} ${r.unit}`,
              emission: r.emission_co2e,
              status: r.status,
              period: r.period_start,
              href: `/company/carbon/vehicle/${r.id}`,
            })),
            ...(fugitive ?? []).map(r => ({
              id: r.id, type: 'fugitive' as ActivityType,
              label: `${r.refrigerant_name} (${r.method === 'top_up' ? 'Top-Up' : 'Screening'})`,
              sub: 'Fugitive',
              emission: r.emission_co2e,
              status: r.status,
              period: r.period_start,
              href: `/company/carbon/fugitive/${r.id}`,
            })),
          ].sort((a, b) => b.period.localeCompare(a.period))} />

        <ActivitySection title="Scope 2 — Energy" scope="S2" color="sky"
          entries={(energy ?? []).map(r => ({
            id: r.id, type: 'energy' as ActivityType,
            label: r.energy_type === 'electricity' ? `Listrik${r.region_name ? ` (${r.region_name})` : ''}` : 'Steam',
            sub: `${r.consumption} ${r.unit}`,
            emission: r.emission_co2e,
            status: r.status,
            period: r.period_start,
            href: `/company/carbon/energy/${r.id}`,
          }))} />

        <ActivitySection title="Scope 3 — Cat 1: Purchased Goods/Services" scope="S3" color="purple"
          entries={(s3c1 ?? []).map(r => ({
            id: r.id, type: 's3c1' as ActivityType,
            label: getS3Label(r),
            sub: `${Number(r.quantity).toLocaleString('id-ID')} ${r.unit}`,
            emission: r.emission_co2e,
            status: r.status,
            period: r.period_start,
            href: `/company/carbon/s3c1/${r.id}`,
          }))} />

        <ActivitySection title="Scope 3 — Cat 2: Capital Goods" scope="S3" color="purple"
          entries={(s3c2 ?? []).map(r => ({
            id: r.id, type: 's3c2' as ActivityType,
            label: getS3Label(r),
            sub: `${Number(r.quantity).toLocaleString('id-ID')} ${r.unit}`,
            emission: r.emission_co2e,
            status: r.status,
            period: r.period_start,
            href: `/company/carbon/s3c2/${r.id}`,
          }))} />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[18px] shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)] px-8 py-14 flex flex-col items-center justify-center text-center">
          <span className="w-16 h-16 rounded-2xl bg-mint/60 border border-sage/30 text-sage-dark flex items-center justify-center mb-4 shadow-[0_12px_24px_-12px_rgba(85,158,123,0.35)]">
            <Leaf className="w-8 h-8" strokeWidth={1.5} />
          </span>
          <h2 className="text-xl font-extrabold text-ink tracking-tight">Belum ada data emisi</h2>
          <p className="mt-2 text-sm text-muted max-w-md leading-relaxed">
            Mulai lacak jejak karbon perusahaan. dengan klik input karbon
          </p>
        </div>
      )}
    </div>
  )
}

type S3Row = {
  id: string
  method: string
  material_name: string | null
  sector_name: string | null
  supplier_name: string | null
  product_name: string | null
}

function getS3Label(r: S3Row): string {
  switch (r.method) {
    case 'supplier_specific': {
      const parts = [r.supplier_name, r.product_name].filter(Boolean)
      return parts.length > 0 ? parts.join(' — ') : 'Supplier-Specific'
    }
    case 'average_data':
      return r.material_name ?? 'Average-Data'
    case 'spend_based':
      return r.sector_name ?? 'Spend-Based'
    default:
      return r.method
  }
}

const scopeColorMap: Record<string, { bg: string; text: string; border: string }> = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
}

function ActivitySection({ title, scope, color, entries }: { title: string; scope: string; color: string; entries: ActivityEntry[] }) {
  const scopeColor = scopeColorMap[color] ?? scopeColorMap.amber
  const isEmpty = entries.length === 0

  return (
    <div className="bg-surface border border-border rounded-[18px] overflow-hidden shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
      <div className="px-6 py-3.5 border-b border-border bg-canvas/40 flex items-center gap-2.5">
        <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${scopeColor.bg} ${scopeColor.text} ${scopeColor.border}`}>
          {scope}
        </span>
        <h3 className="text-xs font-bold text-ink tracking-tight">{title}</h3>
        <span className="ml-auto text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
          {entries.length} entri
        </span>
      </div>
      {isEmpty ? (
        <div className="px-6 py-10 flex flex-col items-center justify-center text-center">
          <span className="w-10 h-10 rounded-xl bg-canvas border border-border text-muted flex items-center justify-center mb-2.5">
            <Inbox className="w-5 h-5" strokeWidth={1.6} />
          </span>
          <p className="text-sm font-semibold text-muted">Belum ada data</p>
          <p className="text-xs text-muted/70 mt-1">Tambahkan lewat tombol «Input Karbon» di atas.</p>
        </div>
      ) : (
        <ActivitySectionList entries={entries} />
      )}
    </div>
  )
}