import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import VerificationList from './_components/VerificationList'

export default async function AdminVerificationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch pending requests with entity data
  const { data: requests } = await supabase
    .from('verification_requests')
    .select(`
      id,
      entity_type,
      entity_id,
      status,
      note,
      created_at,
      reviewed_at
    `)
    .order('created_at', { ascending: false })
    .limit(300)

  const companyIds =
    requests?.filter((r) => r.entity_type === 'company').map((r) => r.entity_id) ?? []
  const recyclerIds =
    requests?.filter((r) => r.entity_type === 'recycler').map((r) => r.entity_id) ?? []

  const [companiesRes, recyclersRes] = await Promise.all([
    companyIds.length > 0
      ? supabase
          .from('companies')
          .select('id, name, segment, user_id')
          .in('id', companyIds)
      : Promise.resolve({ data: [] }),
    recyclerIds.length > 0
      ? supabase
          .from('recyclers')
          .select('id, name, user_id')
          .in('id', recyclerIds)
      : Promise.resolve({ data: [] }),
  ])

  const companies = companiesRes.data ?? []
  const recyclers = recyclersRes.data ?? []

  type EntityEntry = {
    id: string
    name: string
    type: 'company' | 'recycler'
    segment?: string | null
  }

  const entityMap = new Map<string, EntityEntry>()
  for (const c of companies) {
    entityMap.set(c.id, {
      id: c.id,
      name: c.name,
      type: 'company',
      segment: c.segment ?? null,
    })
  }
  for (const r of recyclers) {
    entityMap.set(r.id, {
      id: r.id,
      name: r.name,
      type: 'recycler',
    })
  }

  const pending = requests?.filter((r) => r.status === 'pending') ?? []
  const reviewed = requests?.filter((r) => r.status !== 'pending') ?? []

  const toItems = (
    list: typeof pending,
  ): {
    request: (typeof pending)[number]
    entity: EntityEntry | undefined
  }[] =>
    list.map((req) => ({
      request: req,
      entity: entityMap.get(req.entity_id),
    }))

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
          Verifikasi <span className="text-sage">Entitas.</span>
        </h1>
        <p className="mt-3 text-sm text-muted max-w-xl">
          Review dan verifikasi perusahaan serta fasilitas daur ulang. Klik nama entitas untuk melihat detail profil.
        </p>
      </div>

      {requests?.length ? (
        <VerificationList
          pending={toItems(pending)}
          reviewed={toItems(reviewed)}
        />
      ) : (
        <div className="bg-surface border border-border rounded-[18px] p-12 text-center shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="w-14 h-14 rounded-full bg-canvas flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6 text-muted" strokeWidth={1.8} />
          </div>
          <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-1">
            Antrian Kosong
          </p>
          <p className="text-sm text-muted">Belum ada permintaan verifikasi</p>
        </div>
      )}
    </div>
  )
}