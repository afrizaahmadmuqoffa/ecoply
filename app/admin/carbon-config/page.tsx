import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CarbonConfigTabs from './_components/CarbonConfigTabs'

export default async function AdminCarbonConfigPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: combustion },
    { data: vehicles },
    { data: refrigerants },
    { data: fugitiveAssets },
    { data: grids },
    { data: s3c1Avg },
    { data: s3c1Spend },
    { data: s3c2Avg },
    { data: s3c2Spend },
    { data: recycling },
  ] = await Promise.all([
    supabase.from('ef_combustion').select('*').order('scope_category').order('fuel_name').order('unit').limit(500),
    supabase.from('ef_vehicle').select('*').order('vehicle_type').order('unit').limit(500),
    supabase.from('refrigerant_gwp').select('*').order('gas_type').order('refrigerant_name').limit(500),
    supabase.from('fugitive_asset_categories').select('*').order('category_name').limit(500),
    supabase.from('grid_emission_factors').select('*').order('energy_type').order('region_name').limit(500),
    supabase.from('s3c1_average_factors').select('*').order('material_name').limit(500),
    supabase.from('s3c1_spend_factors').select('*').order('sector_name').order('currency').limit(500),
    supabase.from('s3c2_average_factors').select('*').order('material_name').limit(500),
    supabase.from('s3c2_spend_factors').select('*').order('sector_name').order('currency').limit(500),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('recycling_avoided_factors').select('*').order('material_name').limit(500),
  ])

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
          Konfigurasi <span className="text-sage">Carbon Accounting.</span>
        </h1>
        <p className="mt-3 text-sm text-muted max-w-2xl">
          Kelola faktor emisi dan parameter perhitungan karbon. Pilih kategori di sidebar untuk mengelola setiap tabel.
        </p>
      </div>

      <CarbonConfigTabs
        combustion={combustion ?? []}
        vehicles={(vehicles ?? []).map(v => ({ ...v, unit: (v.unit as 'km' | 'mile') || 'km' }))}
        refrigerants={refrigerants ?? []}
        fugitiveAssets={fugitiveAssets ?? []}
        grids={grids ?? []}
        s3c1Avg={s3c1Avg ?? []}
        s3c1Spend={s3c1Spend ?? []}
        s3c2Avg={s3c2Avg ?? []}
        s3c2Spend={s3c2Spend ?? []}
        recycling={recycling ?? []}
      />
    </div>
  )
}