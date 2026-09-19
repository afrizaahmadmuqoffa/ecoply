import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import S3C2ReviewContent from '../../_components/S3C2ReviewContent'

export default async function S3C2ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()

  const [{ data: entry }, { data: avgFactors }, { data: spendFactors }] = await Promise.all([
    supabase.from('ca_s3c2').select('*').eq('id', id).eq('company_id', profile?.company_id ?? '').single(),
    supabase.from('s3c2_average_factors').select('id, material_name, unit, ef_kg_co2e').eq('is_active', true).order('material_name'),
    supabase.from('s3c2_spend_factors').select('id, sector_name, currency, ef_kg_co2e').eq('is_active', true).order('sector_name'),
  ])

  if (!entry) notFound()

  const methodLabel =
    entry.method === 'supplier_specific' ? 'Supplier Specific' :
    entry.method === 'average_data' ? 'Average Data' : 'Spend Based'

  const itemLabel =
    entry.method === 'supplier_specific' ? `${entry.supplier_name ?? '—'} — ${entry.product_name ?? '—'}` :
    entry.method === 'average_data' ? (entry.material_name ?? '—') :
    (entry.sector_name ?? '—')

  return <S3C2ReviewContent entry={entry} avgFactors={avgFactors ?? []} spendFactors={spendFactors ?? []} methodLabel={methodLabel} itemLabel={itemLabel} />
}
