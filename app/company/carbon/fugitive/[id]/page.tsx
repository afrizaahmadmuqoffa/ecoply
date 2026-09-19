import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import FugitiveReviewContent from '../../_components/FugitiveReviewContent'

export default async function FugitiveReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()

  const [{ data: entry }, { data: refrigerants }, { data: assetCategories }] = await Promise.all([
    supabase.from('ca_fugitive').select('*').eq('id', id).eq('company_id', profile?.company_id ?? '').single(),
    supabase.from('refrigerant_gwp').select('id, refrigerant_name, gwp_value, gas_type').eq('is_active', true).order('refrigerant_name'),
    supabase.from('fugitive_asset_categories').select('id, category_name, annual_leakage_rate, typical_refrigerant').eq('is_active', true).order('category_name'),
  ])

  if (!entry) notFound()

  const methodLabel = entry.method === 'top_up' ? 'Top-Up' : 'Screening'

  return (
    <FugitiveReviewContent
      entry={entry}
      refrigerants={refrigerants ?? []}
      assetCategories={assetCategories ?? []}
      methodLabel={methodLabel}
    />
  )
}