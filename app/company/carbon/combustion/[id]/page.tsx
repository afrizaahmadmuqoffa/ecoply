import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import CombustionReviewContent from '../../_components/CombustionReviewContent'

export default async function CombustionReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const [{ data: entry }, { data: factors }] = await Promise.all([
    supabase.from('ca_combustion').select('*').eq('id', id).eq('company_id', profile?.company_id ?? '').single(),
    supabase.from('ef_combustion').select('id, scope_category, fuel_name, unit, ef_scope1_co2e, is_fossil').eq('is_active', true).order('scope_category').order('fuel_name'),
  ])

  if (!entry) notFound()

  const scopeLabel = entry.scope_category === 'stationary' ? 'Stationary' : 'Mobile (Fuel)'
  const scopeFactors = (factors ?? []).filter(f => f.scope_category === entry.scope_category)

  return (
    <CombustionReviewContent
      entry={entry}
      scopeLabel={scopeLabel}
      scopeFactors={scopeFactors}
    />
  )
}