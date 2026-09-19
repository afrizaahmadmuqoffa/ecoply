import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EnergyReviewContent from '../../_components/EnergyReviewContent'

export default async function EnergyReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()

  const [{ data: entry }, { data: gridFactors }] = await Promise.all([
    supabase.from('ca_energy').select('*').eq('id', id).eq('company_id', profile?.company_id ?? '').single(),
    supabase.from('grid_emission_factors').select('id, region_name, energy_type, unit, ef_kg_co2e, method').eq('is_active', true).order('energy_type').order('region_name'),
  ])

  if (!entry) notFound()

  const typeLabel = entry.energy_type === 'electricity' ? 'Listrik' : 'Steam'
  const regionLabel = entry.region_name ? ` (${entry.region_name})` : ''

  return <EnergyReviewContent entry={entry} gridFactors={gridFactors ?? []} typeLabel={typeLabel} regionLabel={regionLabel} />
}