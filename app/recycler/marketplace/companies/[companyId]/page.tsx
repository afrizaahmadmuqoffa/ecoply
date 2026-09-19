import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { INDUSTRY_OPTIONS } from '@/lib/constants/industries'
import { AlertTriangle, ArrowLeft, BadgeCheck, ChevronRight, Clock, Info, Lock, MapPin } from 'lucide-react'
import ProfileHero from '@/components/profile/ProfileHero'
import ProfileCardHeader from '@/components/profile/ProfileCardHeader'
import CertificatesSection from '@/components/marketplace/CertificatesSection'

type CompanyProfile = {
  id: string
  name: string
  industry: string | null
  npwp: string | null
  logo_url: string | null
  verification_status: string
  address_text: string | null
  address: string | null
  certifications: Certification[] | null
  created_at: string
}

type Certification = {
  name: string
  file_url: string
  uploaded_at: string
}

const maskNpwp = (npwp: string) => {
  const clean = npwp.replace(/[^0-9]/g, '')
  if (clean.length < 6) return npwp
  return `••••••••-•••-${clean.slice(-3)}`
}

export const dynamic = 'force-dynamic'

export default async function CompanyProfilePage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Baca lewat view aman-PII (verified only), bukan base table.
  const { data: row } = await supabase
    .from('view_company_public')
    .select('*')
    .eq('id', companyId)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowAny = row as any
  const data: CompanyProfile | null = row
    ? {
        id: rowAny.id,
        name: rowAny.name,
        industry: rowAny.industry,
        npwp: rowAny.npwp,
        logo_url: rowAny.logo_url,
        verification_status: rowAny.verification_status,
        address_text: rowAny.address_text,
        address: rowAny.address,
        certifications: rowAny.certifications,
        created_at: rowAny.created_at,
      }
    : null

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-700" strokeWidth={1.8} />
        </div>
        <p className="text-sm font-bold text-ink mb-1">Company tidak ditemukan</p>
        <p className="text-xs text-muted mb-6">Profil tidak tersedia atau belum terverifikasi.</p>
        <Link
          href="/recycler/marketplace"
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          Kembali
        </Link>
      </div>
    )
  }

  const industryLabel = INDUSTRY_OPTIONS.find((o) => o.value === data.industry)?.label || data.industry
  const address = data.address_text || data.address
  const certifications = data.certifications || []

  return (
    <div>
      {/* Top nav */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <Link
          href="/recycler/marketplace"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-sage-dark transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
          Kembali ke Marketplace
        </Link>
        <nav className="flex items-center gap-2 text-xs text-muted">
          <Link href="/recycler/marketplace" className="hover:text-sage-dark transition-colors">
            Marketplace
          </Link>
          <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
          <span className="text-ink font-semibold truncate max-w-[240px]">{data.name}</span>
        </nav>
      </div>

      {/* Hero */}
      <ProfileHero
        avatarUrl={data.logo_url}
        avatarAlt={data.name}
        fallback={data.name.charAt(0).toUpperCase()}
        eyebrow="Profil Company"
        name={data.name}
        badges={
          <>
            {data.verification_status === 'verified' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sage text-white text-xs font-bold tracking-wider uppercase rounded-full shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]">
                <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
                Terverifikasi
              </span>
            )}
            {data.verification_status === 'pending' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 text-xs font-bold tracking-wider uppercase rounded-full border border-amber-200">
                <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                Menunggu Verifikasi
              </span>
            )}
            <span className="text-xs text-muted">
              Terdaftar {new Date(data.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </>
        }
      />

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main */}
        <div className="lg:col-span-8 space-y-6">
          {/* Detail info */}
          <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <ProfileCardHeader
              icon={<Info className="w-4 h-4" strokeWidth={2} />}
              title="Informasi Perusahaan"
              subtitle="Data profil company"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <div className="bg-canvas border border-border rounded-xl p-4">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Industri</p>
                <p className="text-sm font-bold text-ink tracking-tight">{industryLabel || '—'}</p>
              </div>
              <div className="bg-canvas border border-border rounded-xl p-4">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">NPWP</p>
                <p className="text-sm font-bold text-ink tracking-tight font-mono tabular-nums">
                  {data.npwp ? maskNpwp(data.npwp) : '—'}
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-border">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Alamat</p>
                  <p className="text-sm text-ink leading-relaxed">{address || 'Belum diatur'}</p>
                  {data.npwp && (
                    <p className="text-[10px] text-muted mt-2 flex items-center gap-1">
                      <Lock className="w-3 h-3" strokeWidth={2} />
                      Ditampilkan sebagian demi privasi
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Certifications */}
          <CertificatesSection certifications={certifications} accent="company" />
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
          {/* Info card */}
          <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-canvas text-muted flex items-center justify-center">
                <Info className="w-4 h-4" strokeWidth={2} />
              </span>
              <h3 className="text-sm font-extrabold text-ink tracking-tight">Statistik</h3>
            </div>

            <dl className="space-y-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Terdaftar</dt>
                <dd className="text-ink font-bold">
                  {new Date(data.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Verifikasi</dt>
                <dd className={`font-bold inline-flex items-center gap-1.5 ${data.verification_status === 'verified' ? 'text-sage-dark' : 'text-amber-700'}`}>
                  {data.verification_status === 'verified' ? 'Terverifikasi' : 'Menunggu'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Sertifikasi</dt>
                <dd className="text-ink font-extrabold tabular-nums">{certifications.length}</dd>
              </div>
            </dl>
          </div>

          {/* Disclaimer */}
          <div className="bg-canvas border border-border rounded-[18px] p-4">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-[11px] text-muted leading-relaxed">
                Beberapa data ditampilkan sebagian untuk melindungi privasi company.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}