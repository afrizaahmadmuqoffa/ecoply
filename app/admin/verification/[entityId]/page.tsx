import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, Clock, FileText, Info, Lock, Scale, ShieldCheck, User, X } from 'lucide-react'
import EntityActions from './_components/EntityActions'
import ProfileHero from '@/components/profile/ProfileHero'
import ProfileCardHeader from '@/components/profile/ProfileCardHeader'

const segmentLabel: Record<string, string> = {
  umkm: 'UMKM',
  non_umkm: 'Menengah & Besar',
}

const statusConfig: Record<string, { label: string; classes: string; iconBg: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Menunggu',
    classes: 'text-amber-700 bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    icon: (
      <Clock className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  verified: {
    label: 'Terverifikasi',
    classes: 'text-sage-dark bg-mint border-sage/30',
    iconBg: 'bg-sage/20 text-sage-dark',
    icon: (
      <Check className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  rejected: {
    label: 'Ditolak',
    classes: 'text-red-700 bg-red-50 border-red-200',
    iconBg: 'bg-red-100 text-red-700',
    icon: (
      <X className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
}

function InfoTile({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="bg-canvas border border-border rounded-xl p-4">
      <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">{label}</p>
      <p className={`text-sm font-bold text-ink tracking-tight ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function StatusPill({ status }: { status: (typeof statusConfig)[string] }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${status.classes}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${status.iconBg}`}>
        {status.icon}
      </span>
      {status.label}
    </span>
  )
}

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ entityId: string }>
}) {
  const { entityId } = await params
  const supabase = await createClient()

  const [companyRes, recyclerRes] = await Promise.all([
    supabase.from('companies').select('*').eq('id', entityId).maybeSingle(),
    supabase.from('recyclers').select('*').eq('id', entityId).maybeSingle(),
  ])

  const company = companyRes.data ?? null
  const recycler = recyclerRes.data ?? null

  if (!company && !recycler) notFound()

  const isCompany = Boolean(company)

  // ── Owner info + email ──
  const userId = isCompany ? company?.user_id : recycler?.user_id
  let contactName: string | null = null
  let email: string | null = null
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()
    contactName = profile?.full_name ?? null
    const { data: emailData } = await supabase.rpc('admin_get_user_email', {
      p_user_id: userId,
    })
    email = emailData ?? null
  }

  // ── Recycler details ──
  const { data: recyclerDetails } = recycler
    ? await supabase.from('recycler_details').select('*').eq('recycler_id', recycler.id).maybeSingle()
    : { data: null as null }

  // ── Latest verification request ──
  const { data: requests } = await supabase
    .from('verification_requests')
    .select('id, entity_type, entity_id, status, note, created_at, reviewed_at')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(1)

  const request = requests?.[0] ?? null

  const name = isCompany ? company?.name : recycler?.name
  const created = request?.created_at ?? (isCompany ? company?.created_at : recycler?.created_at)
  const currentStatus = request?.status ?? 'pending'
  const status = statusConfig[currentStatus] ?? statusConfig.pending

  const certs = isCompany
    ? (company?.certifications as { name: string; file_url: string }[] | null)
    : (recyclerDetails?.certifications as { name: string; file_url: string }[] | null)

  const coords = (() => {
    const loc = isCompany ? company?.location : recyclerDetails?.location
    if (!loc) return null
    const text = String(loc)
    const m = text.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/)
    if (!m) return null
    return { lat: parseFloat(m[2]), lng: parseFloat(m[1]) }
  })()

  const infoRows = (() => {
    if (isCompany) {
      return [
        { label: 'Nama Perusahaan', value: company?.name },
        {
          label: 'Segmen',
          value: company?.segment
            ? segmentLabel[company.segment] ?? company.segment
            : null,
        },
        { label: 'Industri', value: company?.industry },
        { label: 'NPWP', value: company?.npwp, mono: true },
        { label: 'NIB', value: company?.nib, mono: true },
        { label: 'NIK', value: company?.nik, mono: true },
        { label: 'Alamat', value: company?.address_text ?? company?.address },
      ]
    }
    return [
      { label: 'Nama Fasilitas', value: recycler?.name },
      { label: 'NIB', value: recycler?.nib, mono: true },
      { label: 'NPWP', value: recycler?.npwp, mono: true },
      { label: 'NIK', value: recycler?.nik, mono: true },
      { label: 'Alamat', value: recycler?.address },
    ]
  })()

  const registeredDate = created
    ? new Date(created).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <div>
      {/* Top bar: back link + breadcrumb */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <Link
          href="/admin/verification"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-sage-dark transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
          Kembali ke daftar verifikasi
        </Link>
        <nav className="flex items-center gap-2 text-xs text-muted">
          <Link href="/admin/verification" className="hover:text-sage-dark transition-colors">
            Verifikasi
          </Link>
          <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
          <span className="text-ink font-semibold truncate max-w-[240px]">{name}</span>
        </nav>
      </div>

      {/* Hero profile card */}
      <ProfileHero
        avatarUrl={isCompany ? company?.logo_url : recycler?.logo_url}
        avatarAlt={name ?? ''}
        fallback={name?.charAt(0).toUpperCase() ?? '?'}
        eyebrow={isCompany ? 'Profil Perusahaan' : 'Profil Recycler'}
        name={name ?? '—'}
        badges={
          <>
            <span className="text-xs text-muted font-medium">
              {isCompany ? 'Perusahaan' : 'Recycler'}
            </span>
            <span aria-hidden className="w-1 h-1 rounded-full bg-muted/40" />
            {isCompany && company?.segment && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-mint text-sage-dark text-[10px] font-bold uppercase tracking-wider">
                {segmentLabel[company.segment] ?? company.segment}
              </span>
            )}
            <StatusPill status={status} />
            {registeredDate && (
              <>
                <span aria-hidden className="w-1 h-1 rounded-full bg-muted/40" />
                <span className="text-xs text-muted tabular-nums">
                  Didaftarkan {registeredDate}
                </span>
              </>
            )}
          </>
        }
      />

      {/* Main content grid: content (left) + sidebar (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Data entitas */}
          <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <ProfileCardHeader
              icon={<Info className="w-4 h-4" strokeWidth={2} />}
              title={isCompany ? 'Informasi Perusahaan' : 'Informasi Fasilitas'}
              subtitle="Data profil untuk ditinjau"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {infoRows.map((row) => (
                <InfoTile key={row.label} label={row.label} value={row.value} mono={row.mono} />
              ))}
            </div>

            {coords && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">
                  Koordinat
                </p>
                <p className="text-sm text-ink font-mono tracking-tight tabular-nums">
                  {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>

          {/* Recycler: kapasitas + layanan */}
          {recycler && (
            <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
              <ProfileCardHeader
                icon={<Scale className="w-4 h-4" strokeWidth={2} />}
                title="Kapasitas & Layanan"
                subtitle="Detail operasional fasilitas"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recyclerDetails?.capacity_per_month != null && (
                  <InfoTile
                    label="Kapasitas per Bulan"
                    value={`${Number(recyclerDetails.capacity_per_month).toLocaleString('id-ID')} kg`}
                  />
                )}
                {recycler?.capacity_kg_per_month != null && (
                  <InfoTile
                    label="Kapasitas (Registrasi)"
                    value={`${recycler.capacity_kg_per_month.toLocaleString('id-ID')} kg`}
                  />
                )}
                {recyclerDetails?.service_radius_km != null && (
                  <InfoTile label="Radius Layanan" value={`${recyclerDetails.service_radius_km} km`} />
                )}
                {recyclerDetails?.is_active != null && (
                  <InfoTile label="Status Aktif" value={recyclerDetails.is_active ? 'Aktif' : 'Non-aktif'} />
                )}
              </div>

              {recyclerDetails?.accepted_materials?.length ? (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted block mb-2.5">
                    Material Diterima
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recyclerDetails.accepted_materials.map((m: string) => (
                      <span
                        key={m}
                        className="inline-flex items-center text-[11px] font-semibold text-sage-dark bg-mint border border-sage/30 rounded-full px-2.5 py-1"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Akun pemilik */}
          <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <ProfileCardHeader
              icon={<User className="w-4 h-4" strokeWidth={2} />}
              title="Akun Pemilik"
              subtitle="Kontak pemilik entitas"
            />
            {(contactName || email) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoTile label="Nama Lengkap" value={contactName} />
                <InfoTile label="Email" value={email} />
              </div>
            ) : (
              <div className="bg-canvas border border-border rounded-xl p-6 text-center">
                <User className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-xs text-muted">Informasi pemilik tidak tersedia</p>
              </div>
            )}
          </div>

          {/* Sertifikasi */}
          <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <ProfileCardHeader
              icon={<FileText className="w-4 h-4" strokeWidth={2} />}
              title="Sertifikasi"
              subtitle="Dokumen pendukung verifikasi"
              count={certs?.length || 0}
            />
            {certs && certs.length > 0 ? (
              <div className="space-y-2">
                {certs.map((cert, i) => (
                  <a
                    key={i}
                    href={cert.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 px-4 py-3 bg-canvas hover:bg-mint/40 border border-border hover:border-sage/40 rounded-xl transition-all"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" strokeWidth={1.8} />
                      </span>
                      <span className="text-sm font-medium text-ink truncate">{cert.name}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-sage-dark flex-shrink-0">
                      Buka
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="bg-canvas border border-border rounded-xl p-6 text-center">
                <FileText className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-xs text-muted">Belum ada sertifikasi</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
          {/* Tindakan verifikasi */}
          <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-canvas text-muted flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" strokeWidth={2} />
                </span>
                <h3 className="text-sm font-extrabold text-ink tracking-tight">Tindakan Verifikasi</h3>
              </div>
              <StatusPill status={status} />
            </div>
            {request && (
              <EntityActions
                requestId={request.id}
                entityId={entityId}
                entityType={request.entity_type === 'company' ? 'company' : 'recycler'}
                reviewable={request.status === 'pending'}
              />
            )}
          </div>

          {/* Statistik */}
          <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-canvas text-muted flex items-center justify-center">
                <Info className="w-4 h-4" strokeWidth={2} />
              </span>
              <h3 className="text-sm font-extrabold text-ink tracking-tight">Statistik</h3>
            </div>

            <dl className="space-y-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Tipe Entitas</dt>
                <dd className="text-ink font-bold">{isCompany ? 'Perusahaan' : 'Recycler'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Didaftarkan</dt>
                <dd className="text-ink font-bold tabular-nums">{registeredDate ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Sertifikasi</dt>
                <dd className="text-ink font-extrabold tabular-nums">{certs?.length || 0}</dd>
              </div>
              {recyclerDetails?.accepted_materials?.length != null && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Material</dt>
                  <dd className="text-ink font-extrabold tabular-nums">
                    {recyclerDetails.accepted_materials?.length || 0}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Disclaimer */}
          <div className="bg-canvas border border-border rounded-[18px] p-4">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-[11px] text-muted leading-relaxed">
                Halaman internal admin. Data berasal dari proses verifikasi terakhir.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Catatan review */}
      {request?.note && (
        <div className="mt-8 bg-amber-50/60 border border-amber-200 rounded-[18px] p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <CircleAlert className="w-3.5 h-3.5" strokeWidth={2.5} />
            </span>
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-amber-800">
              Catatan Review
            </span>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed max-w-4xl">{request.note}</p>
        </div>
      )}
    </div>
  )
}