"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { getPublicManifest, recyclerMarkAttended } from "@/lib/supabase/actions/marketplace"
import Logo from "@/components/Logo"
import { EyeOff, Users, ShieldCheck, FileText, Clock, Check, BadgeCheck, Camera, ArrowRight, Lock, ArrowLeft, AlertTriangle, Info, Download } from "lucide-react"
import { Skeleton } from "@/components/ui/skeletons"

type PublicManifest = {
  manifest_no: string
  status: string
  created_at: string
  attended_at: string | null
  listing_id: string
  material_type: string
  weight_kg: number | null
  company_name: string
  recycler_name: string
  certificate_url: string | null
  level: number
  transaction?: {
    price: number | null
    unit: string
    address_text: string
    pickup_scheduled_at: string | null
    pickup_address: string | null
    pickup_note: string | null
    pickup_recorded_at: string | null
    confirmed_at: string | null
  }
  internal?: {
    manifest_id: string
    bid_id: string
    company_id: string
    recycler_id: string
    bid_note: string | null
    bid_initiator: string
    pickup_recorded_by: string | null
    photo_evidence_count: number
    certificate_id: string | null
    certificate_issued_at: string | null
  }
}

const LEVEL_INFO: Record<number, {
  label: string
  classes: string
  icon: React.ReactNode
}> = {
  1: {
    label: "Verifikasi Publik",
    classes: "text-muted bg-canvas border-border",
    icon: (
      <EyeOff className="w-3 h-3" strokeWidth={2.5} />
    ),
  },
  2: {
    label: "Pihak Terkait",
    classes: "text-sage-dark bg-mint border-sage/30",
    icon: (
      <Users className="w-3 h-3" strokeWidth={2.5} />
    ),
  },
  3: {
    label: "Admin",
    classes: "text-amber-800 bg-amber-50 border-amber-200",
    icon: (
      <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
    ),
  },
}

const STATUS_CONFIG: Record<string, {
  label: string
  classes: string
  heroBg: string
  icon: React.ReactNode
  step: number
}> = {
  issued: {
    label: "Manifest Diterbitkan",
    classes: "text-sky-800 bg-sky-50 border-sky-200",
    heroBg: "from-sky-50 to-sky-100/50",
    icon: (
      <FileText className="w-4 h-4" strokeWidth={2.5} />
    ),
    step: 1,
  },
  pickup_recorded: {
    label: "Pemindahan Dicatat",
    classes: "text-amber-800 bg-amber-50 border-amber-200",
    heroBg: "from-amber-50 to-amber-100/50",
    icon: (
      <Clock className="w-4 h-4" strokeWidth={2.5} />
    ),
    step: 2,
  },
  confirmed: {
    label: "Transaksi Dikonfirmasi",
    classes: "text-sage-dark bg-mint border-sage/30",
    heroBg: "from-mint to-sage/20",
    icon: (
      <Check className="w-4 h-4" strokeWidth={2.5} />
    ),
    step: 3,
  },
  certificate_issued: {
    label: "Sertifikat Terbit",
    classes: "text-sage-dark bg-mint border-sage/30",
    heroBg: "from-mint via-sage/20 to-sage/10",
    icon: (
      <BadgeCheck className="w-4 h-4" strokeWidth={2.5} />
    ),
    step: 4,
  },
}

const STEPS = [
  { label: "Manifest" },
  { label: "Pickup" },
  { label: "Konfirmasi" },
  { label: "Sertifikat" },
]

export default function ManifestVerificationPage({
  params,
}: {
  params: Promise<{ manifestNo: string }>
}) {
  const { manifestNo } = use(params)
  const [manifest, setManifest] = useState<PublicManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attendedResult, setAttendedResult] = useState<null | {
    attended: boolean
    reason?: string
    message?: string
  }>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const result = await getPublicManifest(manifestNo)
      if (cancelled) return
      if (result.error) {
        setError(result.error as string)
      } else if (result.data) {
        setManifest(result.data as PublicManifest)
      }
      setLoading(false)

      if (!cancelled) {
        const att = await recyclerMarkAttended(manifestNo)
        if (!cancelled) setAttendedResult(att)
      }
    }
    init()
    return () => { cancelled = true }
  }, [manifestNo])

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-canvas via-surface to-mint/20 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Brand header */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <Logo height={70} />
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted">
            Verifikasi Manifest
          </p>
        </div>

        {/* Attended banner — recycler scanned QR */}
        {!loading && manifest && attendedResult?.attended && (
          <div className="mb-5 bg-gradient-to-br from-mint via-sage/20 to-surface border border-sage/30 rounded-[22px] p-5 shadow-[0_12px_24px_-12px_rgba(85,158,123,0.18)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-sage/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-sage text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]">
                <Check className="w-5 h-5" strokeWidth={2.5} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-sage-dark tracking-tight">Kehadiran Tercatat!</p>
                <p className="text-xs text-sage-dark mt-1 leading-relaxed">
                  Kamu sudah terdaftar di lokasi pickup. Sekarang catat berat bersih dan foto bukti pickup.
                </p>
                {manifest.status === 'issued' && (
                  <Link
                    href={`/recycler/marketplace/${manifest.listing_id}`}
                    className="group mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-xs font-bold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)]"
                  >
                    <Camera className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Catat Pickup Sekarang
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Not authenticated banner */}
        {!loading && manifest && !attendedResult?.attended && attendedResult?.reason === 'not_authenticated' && (
          <div className="mb-5 bg-sky-50 border border-sky-200 rounded-[22px] p-5 flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-sky-900 tracking-tight">Pencatatan Kehadiran</p>
              <p className="text-xs text-sky-800 mt-1 leading-relaxed">
                Login sebagai recycler untuk mencatat kehadiran dari lokasi pickup.
              </p>
              <Link
                href={`/login?redirectTo=/verify/manifest/${manifestNo}`}
                className="group mt-3 inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-full transition-all hover:-translate-y-0.5"
              >
                Login Sekarang
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="bg-surface border border-border rounded-[22px] p-6 sm:p-8 animate-fade-in">
            <div className="flex items-start gap-3 mb-6">
              <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full flex-shrink-0" />
            </div>
            <div className="flex items-center mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <Skeleton className={`rounded-full ${i === 0 ? 'w-8 h-8' : 'w-8 h-8'}`} />
                    <Skeleton className="h-2.5 w-14 mt-2" />
                  </div>
                  {i < 3 && <Skeleton className="flex-1 h-0.5 mx-2 -mt-5" />}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border border-border rounded-2xl p-4">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ))}
            </div>
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        )}

        {/* Error state */}
        {!loading && (error || !manifest) && (
          <div className="bg-surface border border-border rounded-[22px] p-10 text-center shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
            <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-9 h-9 text-red-700" strokeWidth={1.8} />
            </div>
            <h1 className="text-base font-extrabold text-ink tracking-tight mb-1">
              Manifest Tidak Ditemukan
            </h1>
            <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
              {error || "Data manifest tidak dapat diverifikasi. Pastikan nomor manifest benar."}
            </p>
            <Link
              href="/"
              className="group mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
              Kembali ke Beranda
            </Link>
          </div>
        )}

        {/* Main manifest card */}
        {!loading && manifest && (() => {
          const status = STATUS_CONFIG[manifest.status] || STATUS_CONFIG.issued
          const level = LEVEL_INFO[manifest.level] || LEVEL_INFO[1]
          const currentIdx = status.step - 1

          return (
            <div className="bg-surface border border-border rounded-[22px] overflow-hidden shadow-[0_24px_48px_-24px_rgba(11,31,22,0.12)]">
              {/* Hero with status */}
              <div className={`bg-gradient-to-br ${status.heroBg} border-b border-border p-6 sm:p-8`}>
                <div className="flex items-start justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-[0_6px_12px_-6px_rgba(11,31,22,0.15)] ${
                      manifest.status === 'certificate_issued'
                        ? 'bg-sage text-white'
                        : 'bg-white border border-border'
                    }`}>
                      <span className={manifest.status === 'certificate_issued' ? '' : status.classes.split(' ')[0]}>
                        {status.icon}
                      </span>
                    </span>
                    <div>
                      <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block mb-0.5">
                        Manifest Terverifikasi
                      </span>
                      <p className="text-xs text-ink/70 max-w-[220px]">
                        Data transaksi tercatat sah di sistem ECOPLY
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1.5 rounded-full border ${status.classes} flex-shrink-0`}>
                    {status.icon}
                    {status.label}
                  </span>
                </div>

                {/* Stepper */}
                <div className="flex items-center">
                  {STEPS.map((step, i) => (
                    <div key={step.label} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                          i <= currentIdx
                            ? 'bg-sage text-white shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]'
                            : 'bg-white border-2 border-border text-muted'
                        }`}>
                          {i < currentIdx ? (
                            <Check className="w-4 h-4" strokeWidth={3} />
                          ) : (
                            i + 1
                          )}
                        </div>
                        <span className={`text-[9px] font-bold tracking-wider uppercase mt-1.5 whitespace-nowrap ${
                          i <= currentIdx ? 'text-sage-dark' : 'text-muted'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-2 -mt-5 rounded-full transition-colors ${
                          i < currentIdx ? 'bg-sage' : 'bg-border'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Manifest number ticket */}
              <div className="p-6 sm:p-8 border-b border-border bg-gradient-to-br from-canvas to-mint/10">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
                    Nomor Manifest
                  </p>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${level.classes}`}>
                    {level.icon}
                    {level.label}
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight font-mono break-all">
                  {manifest.manifest_no}
                </p>
              </div>

              {/* Primary info grid */}
              <div className="p-6 sm:p-8 border-b border-border">
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-7 h-7 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center">
                    <Info className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark">
                    Informasi Utama
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-canvas border border-border rounded-xl p-4">
                    <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Material</p>
                    <p className="text-sm font-bold text-ink tracking-tight break-words">
                      {manifest.material_type || '—'}
                    </p>
                  </div>
                  <div className="bg-canvas border border-border rounded-xl p-4">
                    <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Berat Bersih</p>
                    <p className={`text-sm font-extrabold tracking-tight tabular-nums ${
                      manifest.weight_kg != null ? 'text-ink' : 'text-amber-700'
                    }`}>
                      {manifest.weight_kg != null
                        ? `${manifest.weight_kg.toLocaleString('id-ID')} kg`
                        : 'Belum dicatat'}
                    </p>
                  </div>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4 py-2 border-b border-border">
                    <dt className="text-muted">Perusahaan</dt>
                    <dd className="text-ink font-bold text-right">{manifest.company_name || '—'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4 py-2 border-b border-border">
                    <dt className="text-muted">Recycler</dt>
                    <dd className="text-ink font-bold text-right">{manifest.recycler_name || '—'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4 py-2">
                    <dt className="text-muted">Diterbitkan</dt>
                    <dd className="text-ink font-bold text-right tabular-nums text-xs">
                      {new Date(manifest.created_at).toLocaleString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Transaction details — level 2+ */}
              {manifest.transaction && (
                <div className="p-6 sm:p-8 border-b border-border bg-sky-50/30">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sky-800 block">
                        Detail Transaksi
                      </span>
                      <p className="text-[11px] text-sky-700/70 mt-0.5">Hanya untuk pihak terkait</p>
                    </div>
                  </div>

                  <dl className="space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-4 py-2 border-b border-sky-200/50">
                      <dt className="text-sky-900/70">Nilai Penawaran</dt>
                      <dd className="text-ink font-bold text-right">
                        {manifest.transaction.price != null
                          ? `Rp ${manifest.transaction.price.toLocaleString('id-ID')}${manifest.transaction.unit ? ` /${manifest.transaction.unit}` : ''}`
                          : 'Gratis'}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 py-2 border-b border-sky-200/50">
                      <dt className="text-sky-900/70">Lokasi Pickup</dt>
                      <dd className="text-ink font-bold text-right leading-relaxed max-w-[60%]">
                        {manifest.transaction.pickup_address || manifest.transaction.address_text || '—'}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 py-2 border-b border-sky-200/50">
                      <dt className="text-sky-900/70">Jadwal Pickup</dt>
                      <dd className="text-ink font-bold text-right tabular-nums text-xs">
                        {manifest.transaction.pickup_scheduled_at
                          ? new Date(manifest.transaction.pickup_scheduled_at).toLocaleString('id-ID', {
                              day: 'numeric', month: 'long', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : '—'}
                      </dd>
                    </div>
                    {manifest.transaction.pickup_note && (
                      <div className="flex items-start justify-between gap-4 py-2 border-b border-sky-200/50">
                        <dt className="text-sky-900/70">Catatan</dt>
                        <dd className="text-ink font-bold text-right leading-relaxed max-w-[60%]">
                          {manifest.transaction.pickup_note}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-4 py-2 border-b border-sky-200/50">
                      <dt className="text-sky-900/70">Pickup Dicatat</dt>
                      <dd className={`font-bold text-right tabular-nums text-xs ${
                        manifest.transaction.pickup_recorded_at ? 'text-ink' : 'text-amber-700'
                      }`}>
                        {manifest.transaction.pickup_recorded_at
                          ? new Date(manifest.transaction.pickup_recorded_at).toLocaleString('id-ID', {
                              day: 'numeric', month: 'long', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : 'Belum dicatat'}
                      </dd>
                    </div>
                    {manifest.transaction.confirmed_at && (
                      <div className="flex items-start justify-between gap-4 py-2">
                        <dt className="text-sky-900/70">Dikonfirmasi</dt>
                        <dd className="text-sage-dark font-extrabold text-right tabular-nums text-xs">
                          {new Date(manifest.transaction.confirmed_at).toLocaleString('id-ID', {
                            day: 'numeric', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Internal data — admin only */}
              {manifest.internal && (
                <div className="p-6 sm:p-8 border-b border-border bg-amber-50/30">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-800 block">
                        Data Internal Admin
                      </span>
                      <p className="text-[11px] text-amber-700/70 mt-0.5">Akses terbatas</p>
                    </div>
                  </div>

                  <dl className="space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-4 py-1.5">
                      <dt className="text-amber-900/60 font-mono">Manifest ID</dt>
                      <dd className="text-ink font-mono text-right break-all">{manifest.internal.manifest_id}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 py-1.5">
                      <dt className="text-amber-900/60 font-mono">Bid ID</dt>
                      <dd className="text-ink font-mono text-right break-all">{manifest.internal.bid_id}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 py-1.5">
                      <dt className="text-amber-900/60 font-mono">Company ID</dt>
                      <dd className="text-ink font-mono text-right break-all">{manifest.internal.company_id}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 py-1.5">
                      <dt className="text-amber-900/60 font-mono">Recycler ID</dt>
                      <dd className="text-ink font-mono text-right break-all">{manifest.internal.recycler_id}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 py-1.5">
                      <dt className="text-amber-900/60">Inisiator</dt>
                      <dd className="text-ink font-bold text-right">{manifest.internal.bid_initiator}</dd>
                    </div>
                    {manifest.internal.bid_note && (
                      <div className="flex items-start justify-between gap-4 py-1.5">
                        <dt className="text-amber-900/60">Catatan Bid</dt>
                        <dd className="text-ink font-bold text-right max-w-[60%]">{manifest.internal.bid_note}</dd>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-4 py-1.5">
                      <dt className="text-amber-900/60">Foto Bukti</dt>
                      <dd className="text-ink font-bold text-right tabular-nums">
                        {manifest.internal.photo_evidence_count} file
                      </dd>
                    </div>
                    {manifest.internal.certificate_issued_at && (
                      <div className="flex items-start justify-between gap-4 py-1.5">
                        <dt className="text-amber-900/60">Sertifikat Terbit</dt>
                        <dd className="text-ink font-bold text-right tabular-nums text-[11px]">
                          {new Date(manifest.internal.certificate_issued_at).toLocaleString('id-ID', {
                            day: 'numeric', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Certificate download CTA */}
              {manifest.certificate_url && (
                <div className="p-6 sm:p-8 bg-gradient-to-br from-mint via-sage/10 to-surface relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-sage/10 rounded-full blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/3" />

                  <div className="relative flex items-center gap-4">
                    <span className="w-14 h-14 rounded-2xl bg-sage text-white flex items-center justify-center flex-shrink-0 shadow-[0_8px_16px_-8px_rgba(85,158,123,0.4)]">
                      <BadgeCheck className="w-7 h-7" strokeWidth={1.8} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark mb-0.5">
                        Sertifikat Tersedia
                      </p>
                      <p className="text-sm font-extrabold text-ink tracking-tight">
                        Sertifikat Daur Ulang Digital
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Dokumen resmi dari ECOPLY
                      </p>
                    </div>
                    <a
                      href={manifest.certificate_url}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-2 px-5 py-3 bg-sage hover:bg-sage-dark text-white text-xs font-bold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] flex-shrink-0"
                    >
                      <Download className="w-4 h-4" strokeWidth={2.5} />
                      Download
                    </a>
                  </div>
                </div>
              )}

              {/* Footer disclaimer */}
              <div className="px-6 sm:px-8 py-5 bg-canvas/50 border-t border-border flex items-start gap-2.5">
<ShieldCheck className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-muted leading-relaxed">
                  Dokumen ini diverifikasi otomatis oleh <span className="font-bold text-ink">ECOPLY</span>.
                  Data transaksi bersifat immutable dan tidak dapat dimanipulasi setelah tercatat dalam sistem.
                </p>
              </div>
            </div>
          )
        })()}

        {/* Bottom link */}
        {!loading && manifest && (
          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-xs font-semibold text-muted hover:text-sage-dark transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
              Kembali ke beranda
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}