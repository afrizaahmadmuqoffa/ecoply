import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FilePlus } from 'lucide-react'
import RegulationList from './_components/RegulationList'
import RegulationForm from './_components/RegulationForm'

export default async function AdminRegulationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: regulations } = await supabase
    .from('regulations')
    .select('id, title, category, version, status, file_name, file_size, file_path, is_embedded, embedded_at, chunk_count, created_at, updated_at')
    .order('created_at', { ascending: false })

  const active = regulations?.filter((r) => r.status === 'active') ?? []
  const archived = regulations?.filter((r) => r.status === 'archived') ?? []

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
          Dokumen <span className="text-sage">Regulasi.</span>
        </h1>
        <p className="mt-3 text-sm text-muted max-w-2xl">
          Basis pengetahuan Compliance AI — upload regulasi, lihat hasil chunking, edit bagian yang relevan, lalu embed ke vector database.
        </p>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Form upload */}
        <div className="lg:col-span-5 lg:sticky lg:top-6">
          <RegulationForm />
        </div>

        {/* List */}
        <div className="lg:col-span-7 space-y-6">
          {active.length > 0 && (
            <RegulationList title="Aktif" regulations={active} count={active.length} />
          )}
          {archived.length > 0 && (
            <RegulationList title="Diarsipkan" regulations={archived} count={archived.length} muted />
          )}
          {!regulations?.length && (
            <div className="bg-surface border border-border rounded-[18px] p-12 text-center shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
              <div className="w-14 h-14 rounded-full bg-canvas flex items-center justify-center mx-auto mb-4">
                <FilePlus className="w-6 h-6 text-muted" strokeWidth={1.8} />
              </div>
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-1">
                Basis Pengetahuan Kosong
              </p>
              <p className="text-sm text-muted">Upload dokumen regulasi pertama Anda di panel kiri</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}