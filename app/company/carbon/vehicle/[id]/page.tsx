import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import VehicleReviewContent from '../../_components/VehicleReviewContent'

export default async function VehicleReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()

  const [{ data: entry }, { data: factors }] = await Promise.all([
    supabase.from('ca_vehicle').select('*').eq('id', id).eq('company_id', profile?.company_id ?? '').single(),
    supabase.from('ef_vehicle').select('id, vehicle_type, unit, ef_co2e').eq('is_active', true).order('vehicle_type'),
  ])

  if (!entry) notFound()

  return <VehicleReviewContent entry={entry} factors={factors ?? []} />
}