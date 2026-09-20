import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import AuditUploadForm from './_components/AuditUploadForm'
import AuditJobList from './_components/AuditJobList'

export const maxDuration = 300

export default async function CompanyCompliancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, verification_status')
    .eq('id', user.id)
    .single()

  const { data: jobs } = await supabase
    .from('audit_jobs')
    .select('id, document_name, file_size, status, error_message, created_at, completed_at')
    .eq('company_id', profile?.company_id ?? '')
    .order('created_at', { ascending: false })
    .limit(20)

  const jobCounts = (jobs ?? []).reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1
    return acc
  }, {})

  const stats = [
    { label: 'Total Audit', value: jobs?.length ?? 0, accent: 'ink' as const },
    { label: 'Selesai', value: jobCounts.done ?? 0, accent: 'sage' as const },
    { label: 'Diproses', value: (jobCounts.queued ?? 0) + (jobCounts.processing ?? 0), accent: 'sky' as const },
    { label: 'Gagal', value: jobCounts.failed ?? 0, accent: 'red' as const },
  ]

  const accentMap = {
    ink: { ring: 'bg-ink/10 text-ink ring-ink/20', value: 'text-ink' },
    sage: { ring: 'bg-mint text-sage-dark ring-mint/60', value: 'text-sage-dark' },
    sky: { ring: 'bg-sky-50 text-sky-700 ring-sky-100', value: 'text-sky-700' },
    red: { ring: 'bg-red-50 text-red-700 ring-red-100', value: 'text-red-700' },
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
          Audit <span className="text-sage">Kepatuhan ESG.</span>
        </h1>
        <p className="mt-3 text-sm text-muted max-w-2xl">
          Upload dokumen ESG perusahaan (laporan keberlanjutan, sustainability report, dll) untuk diaudit otomatis terhadap regulasi Indonesia oleh AI.
        </p>
      </div>

      {profile?.verification_status !== 'verified' && (
        <div className="mb-6 bg-amber-50/60 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-900">Akun belum terverifikasi</p>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Audit tetap bisa dilakukan, namun laporan bersifat internal sampai akun diverifikasi admin.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
        <div className="lg:col-span-2 lg:sticky lg:top-6">
          <AuditUploadForm />
        </div>
        <div className="lg:col-span-3">
          <AuditJobList jobs={jobs ?? []} />
        </div>
      </div>
    </div>
  )
}