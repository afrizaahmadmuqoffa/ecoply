'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCompanyProfilePublic } from '@/lib/supabase/actions/marketplace'
import { INDUSTRY_OPTIONS } from '@/lib/constants/industries'
import { AlertTriangle, ArrowLeft, BadgeCheck, ChevronRight, Clock, Download, Eye, FileText, Info, Lock, MapPin, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeletons'
import ProfileHero from '@/components/profile/ProfileHero'
import ProfileCardHeader from '@/components/profile/ProfileCardHeader'

type Certification = {
  name: string
  file_url: string
  uploaded_at: string
}

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

const maskNpwp = (npwp: string) => {
  const clean = npwp.replace(/[^0-9]/g, '')
  if (clean.length < 6) return npwp
  return `••••••••-•••-${clean.slice(-3)}`
}

export default function CompanyProfilePage() {
  const params = useParams<{ companyId: string }>()
  const [data, setData] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewingCert, setViewingCert] = useState<Certification | null>(null)

  useEffect(() => {
    async function load() {
      if (!params?.companyId) {
        setError('Company tidak ditemukan')
        setLoading(false)
        return
      }
      const result = await getCompanyProfilePublic(params.companyId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setData((result.data as any) || null)
      if (result.error) setError(result.error)
      setLoading(false)
    }
    load()
  }, [params?.companyId])

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="bg-gradient-to-br from-mint/40 via-sage/5 to-surface border border-sage/20 rounded-[22px] p-6 sm:p-8 mb-6">
          <div className="flex items-start gap-5 flex-wrap">
            <Skeleton className="w-20 h-20 rounded-2xl flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-2/3 max-w-sm" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-32 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface border border-border rounded-[18px] p-6 space-y-3">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="bg-surface border border-border rounded-[18px] p-6 space-y-3">
              <Skeleton className="h-5 w-36" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface border border-border rounded-[18px] p-6 space-y-4">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-700" strokeWidth={1.8} />
        </div>
        <p className="text-sm font-bold text-ink mb-1">Company tidak ditemukan</p>
        <p className="text-xs text-muted mb-6">{error}</p>
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
          <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <ProfileCardHeader
              icon={<BadgeCheck className="w-4 h-4" strokeWidth={2} />}
              title="Sertifikasi"
              subtitle="Dokumen bukti sertifikasi"
              count={certifications.length}
            />

            {certifications.length > 0 ? (
              <div className="space-y-2">
                {certifications.map((cert) => (
                  <div
                    key={cert.file_url}
                    className="flex items-center gap-3 p-4 bg-canvas border border-border rounded-xl hover:border-sage/40 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink tracking-tight truncate">{cert.name}</p>
                      <p className="text-[11px] text-muted mt-0.5 tabular-nums">
                        {new Date(cert.uploaded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => setViewingCert(cert)}
                      className="group/btn inline-flex items-center gap-1 px-3 py-1.5 bg-sage hover:bg-sage-dark text-white text-[11px] font-semibold rounded-full transition-all hover:-translate-y-0.5 flex-shrink-0"
                    >
                      Lihat
                      <Eye className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-canvas border border-border rounded-xl p-6 text-center">
                <BadgeCheck className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-xs text-muted">Belum ada sertifikasi</p>
              </div>
            )}
          </div>
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
                  {data.verification_status === 'verified' ? (
                    <>
                      Terverifikasi
                    </>
                  ) : (
                    'Menunggu'
                  )}
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

      {/* Cert preview modal */}
      {viewingCert && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-[22px] max-w-2xl w-full overflow-hidden shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)]">
            <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block mb-0.5">
                    Sertifikasi
                  </span>
                  <h3 className="text-base font-extrabold text-ink tracking-tight truncate">
                    {viewingCert.name}
                  </h3>
                  <p className="text-xs text-muted mt-0.5 tabular-nums">
                    Diupload{' '}
                    {new Date(viewingCert.uploaded_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingCert(null)}
                className="w-9 h-9 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 bg-canvas flex justify-center items-center min-h-[300px] max-h-[60vh] overflow-hidden">
              {viewingCert.file_url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewingCert.file_url}
                  alt={viewingCert.name}
                  className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-[0_8px_16px_-8px_rgba(11,31,22,0.12)]"
                />
              ) : (
                <iframe
                  src={viewingCert.file_url}
                  title={viewingCert.name}
                  className="w-full h-[55vh] rounded-xl border border-border bg-surface shadow-inner"
                />
              )}
            </div>

            <div className="px-6 py-5 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setViewingCert(null)}
                className="px-5 py-2.5 border border-border hover:border-sage hover:text-sage-dark text-ink text-sm font-semibold rounded-full transition-all"
              >
                Tutup
              </button>
              <a
                href={viewingCert.file_url}
                download
                className="group inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
              >
                <Download className="w-4 h-4" strokeWidth={2.5} />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}