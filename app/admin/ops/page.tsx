import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OpsEventList from './_components/OpsEventList'

export default async function AdminOpsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: events, error } = await supabase
    .from('ops_events')
    .select('id, kind, level, message, source, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
          Log <span className="text-sage">Operasional.</span>
        </h1>
        <p className="mt-3 text-sm text-muted max-w-2xl">
          Kejadian sistem: error Gemini, rate limit, cron jobs, dan panggilan lambat. Data 200 event terbaru ditampilkan secara read-only.
        </p>
      </div>

      {/* List */}
      <div className="bg-surface border border-border rounded-[18px] overflow-hidden shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
        {/* List header */}
        <div className="px-6 py-3.5 border-b border-border bg-canvas/40 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
            Event Log
          </span>
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
            {events?.length ?? 0} entries
          </span>
        </div>

        <OpsEventList events={events ?? []} error={error?.message} />
      </div>
    </div>
  )
}