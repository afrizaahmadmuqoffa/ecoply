'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  getListingFulfillment,
  recordPickup,
  companyConfirmPickup,
  issueCertificate,
  confirmPickupSchedule,
} from '@/lib/supabase/actions/marketplace'
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  X,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeletons'

type ManifestStatus =
  | 'issued'
  | 'pickup_recorded'
  | 'confirmed'
  | 'certificate_issued'

type Manifest = {
  id: string
  listing_id: string
  bid_id: string
  manifest_no: string
  qr_code: string
  status: ManifestStatus
  recycler_confirmed_at: string | null
  company_confirmed_at: string | null
  attended_at: string | null
  created_at: string
}

type PickupRecord = {
  id: string
  manifest_id: string
  net_weight_kg: number
  photo_evidence: string[]
  recorded_by: string
  created_at: string
}

type Certificate = {
  id: string
  manifest_id: string
  company_name: string
  recycler_name: string
  material_type: string
  weight_kg: number
  co2e_avoided_kg: number
  virgin_ef_kg_co2e?: number | null
  recycled_ef_kg_co2e?: number | null
  ef_source?: string | null
  ef_unit?: string | null
  pdf_url: string
  issued_at: string
}

type ScheduleInfo = {
  bid_id: string
  pickup_scheduled_at: string | null
  pickup_address: string | null
  pickup_note: string | null
}

export type FulfillmentData = {
  manifest: Manifest | null
  pickupRecord: PickupRecord | null
  certificate: Certificate | null
  schedule: ScheduleInfo | null
  meta: {
    company_name: string
    recycler_name: string
    material_type: string
    weight: number | null
    unit: string
    address_text: string
    ef_virgin_kg_co2e: number | null
    ef_recycled_kg_co2e: number | null
    ef_kg_co2e: number | null
    ef_source: string | null
    ef_year: number | null
    ef_unit: string
    co2e_avoided_kg: number | null
  }
}

const STATUS_CONFIG: Record<ManifestStatus, {
  label: string
  classes: string
  icon: React.ReactNode
}> = {
  issued: {
    label: 'Manifest Terbit',
    classes: 'text-sky-800 bg-sky-50 border-sky-200',
    icon: (
      <FileText className="w-3 h-3" strokeWidth={2.5} />
    ),
  },
  pickup_recorded: {
    label: 'Menunggu Konfirmasi',
    classes: 'text-amber-800 bg-amber-50 border-amber-200',
    icon: (
      <Clock className="w-3 h-3" strokeWidth={2.5} />
    ),
  },
  confirmed: {
    label: 'Siap Sertifikat',
    classes: 'text-sage-dark bg-mint border-sage/30',
    icon: (
      <Check className="w-3 h-3" strokeWidth={2.5} />
    ),
  },
  certificate_issued: {
    label: 'Sertifikat Terbit',
    classes: 'text-sage-dark bg-mint border-sage/30',
    icon: (
      <BadgeCheck className="w-3 h-3" strokeWidth={2.5} />
    ),
  },
}

const STEPS: { status: ManifestStatus; label: string }[] = [
  { status: 'issued', label: 'Manifest' },
  { status: 'pickup_recorded', label: 'Pickup' },
  { status: 'confirmed', label: 'Konfirmasi' },
  { status: 'certificate_issued', label: 'Sertifikat' },
]

function efDim(unit: string | null | undefined) {
  return (unit ?? 'kg') === 'tonne' ? 1000 : 1
}

function efLabel(unit: string | null | undefined) {
  return (unit ?? 'kg') === 'tonne' ? 'tonne' : 'kg'
}

function formatMass(weightKg: number | null | undefined, unit: string | null | undefined) {
  if (weightKg == null) return '—'
  const d = efDim(unit)
  const v = d === 1000 ? Math.round((weightKg / 1000) * 100) / 100 : weightKg
  return `${v} ${efLabel(unit)}`
}

export default function FulfillmentPanel({
  listingId,
  role,
  onChanged,
  refreshKey,
  initialData,
}: {
  listingId: string
  role: 'company' | 'recycler'
  onChanged?: () => void
  refreshKey?: number
  initialData?: FulfillmentData | null
}) {
  const [data, setData] = useState<FulfillmentData | null>(initialData ?? null)
  const [loading, setLoading] = useState(initialData === undefined)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const initializedRef = useRef(false)

  const load = useCallback(async () => {
    const result = await getListingFulfillment(listingId)
    setMessage(null)
    if (result.data) {
      setData(result.data as FulfillmentData)
      setPhotoUrls([])
    }
  }, [listingId])

  useEffect(() => {
    let cancelled = false
    const first = !initializedRef.current
    async function init() {
      if (first) {
        initializedRef.current = true
        // initialData disiapkan halaman sebelum panel dimount → tanpa skeleton.
        if (initialData === undefined) setLoading(true)
      }
      const result = await getListingFulfillment(listingId)
      if (cancelled) return
      if (result.data) {
        setData(result.data as FulfillmentData)
        setPhotoUrls([])
      }
      setLoading(false)
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, refreshKey])

  useEffect(() => {
    const paths = data?.pickupRecord?.photo_evidence ?? []
    if (paths.length === 0) return
    const supabase = createClient()
    supabase.storage
      .from('pickup-evidence')
      .createSignedUrls(paths, 3600)
      .then(({ data: urls }) => {
        if (urls) {
          setPhotoUrls(
            urls
              .map((u) => u.signedUrl)
              .filter((u): u is string => Boolean(u)),
          )
        }
      })
  }, [data?.pickupRecord])

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)] animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-32 rounded-lg" />
        </div>
        <div className="flex items-center gap-2 mb-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <Skeleton className="w-7 h-7 rounded-full" />
              {i < 4 && <Skeleton className="flex-1 h-0.5 mx-2" />}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      </div>
    )
  }

  if (!data) return null

  // Belum ada manifest → company perlu jadwalkan pickup
  if (!data.manifest) {
    if (role !== 'company') return null
    const canSchedule = Boolean(data.schedule)

    return (
      <div className="bg-gradient-to-br from-sage/5 via-mint/30 to-surface border border-sage/20 rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(85,158,123,0.12)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-9 h-9 rounded-lg bg-sage text-white flex items-center justify-center shadow-[0_4px_8px_-4px_rgba(85,158,123,0.3)]">
            <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark">
              Langkah Berikutnya
            </p>
            <p className="text-xs font-semibold text-ink mt-0.5">Terbitkan Manifest</p>
          </div>
        </div>

        <p className="text-xs text-ink/80 leading-relaxed mb-4">
          Konfirmasi jadwal pickup untuk menerbitkan <b className="text-ink">manifest digital</b> dan{' '}
          <b className="text-ink">QR kehadiran</b>. Recycler akan memindai QR di lokasi untuk mencatat kehadiran.
        </p>

        <button
          onClick={() => setScheduleModalOpen(true)}
          disabled={!canSchedule || busy}
          className="group w-full bg-sage hover:bg-sage-dark text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          <Calendar className="w-4 h-4" strokeWidth={2} />
          Jadwalkan Pickup
        </button>

        {!canSchedule && (
          <p className="text-[11px] text-muted mt-3 text-center leading-relaxed">
            Terima bid favoritmu dulu agar bisa menjadwalkan pickup.
          </p>
        )}

        {scheduleModalOpen && data.schedule && (
          <SchedulePickupModal
            listingId={listingId}
            materialLabel={`${data.meta.material_type} (${data.meta.weight ?? '-'} ${data.meta.unit})`}
            defaultAddress={data.schedule.pickup_address || data.meta.address_text || ''}
            defaultScheduledAt={data.schedule.pickup_scheduled_at || undefined}
            onClose={() => setScheduleModalOpen(false)}
            onSuccess={async () => {
              setScheduleModalOpen(false)
              setMessage({ type: 'success', text: 'Pickup dikonfirmasi — manifest & QR terbit!' })
              await load()
              onChanged?.()
            }}
          />
        )}
      </div>
    )
  }

  const manifest = data.manifest
  const currentIdx = STEPS.findIndex((s) => s.status === manifest.status)
  const statusInfo = STATUS_CONFIG[manifest.status]

  const handleConfirm = async () => {
    setBusy(true)
    setMessage(null)
    const formData = new FormData()
    formData.append('manifest_id', manifest.id)
    const result = await companyConfirmPickup(formData)
    setBusy(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error as string })
      toast.error(result.error as string)
      return
    }
    setMessage({
      type: 'success',
      text: 'Transaksi dikonfirmasi! Listing ditandai Selesai.',
    })
    toast.success('Transaksi dikonfirmasi! Listing ditandai Selesai.')
    await load()
    onChanged?.()
  }

  const handleIssueCertificate = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const weightKg = data.pickupRecord?.net_weight_kg ?? 0
      const efD = (data.meta.ef_unit ?? 'kg') === 'tonne' ? 1000 : 1
      const co2eAvoidedKg =
        data.meta.co2e_avoided_kg ??
        (data.meta.ef_kg_co2e != null
          ? Math.round((weightKg * data.meta.ef_kg_co2e) / efD)
          : 0)
      const rendererModule = await import('@react-pdf/renderer')
      const blob = await rendererModule.pdf(
        <CertificateDocument
          manifestNo={manifest.manifest_no}
          companyName={data.meta.company_name}
          recyclerName={data.meta.recycler_name}
          materialType={data.meta.material_type}
          weightKg={weightKg}
          co2eAvoidedKg={co2eAvoidedKg}
          virginEfKgCo2e={data.meta.ef_virgin_kg_co2e}
          recycledEfKgCo2e={data.meta.ef_recycled_kg_co2e}
          efUnit={data.meta.ef_unit}
          efSource={data.meta.ef_source}
          issuedAt={new Date().toISOString()}
          renderer={rendererModule}
        />,
      ).toBlob()

      const file = new File([blob], `sertifikat-${manifest.manifest_no}.pdf`, {
        type: 'application/pdf',
      })

      const formData = new FormData()
      formData.append('manifest_id', manifest.id)
      formData.append('pdf', file)
      const result = await issueCertificate(formData)
      if (result.error) {
        setMessage({ type: 'error', text: result.error as string })
        toast.error(result.error as string)
        return
      }
      setMessage({ type: 'success', text: 'Sertifikat berhasil diterbitkan!' })
      toast.success('Sertifikat berhasil diterbitkan!')
      await load()
      onChanged?.()
    } catch {
      setMessage({ type: 'error', text: 'Gagal membuat sertifikat' })
      toast.error('Gagal membuat sertifikat')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark">
              Fulfillment
            </p>
            <p className="text-xs font-semibold text-ink mt-0.5">Progress Transaksi</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border ${statusInfo.classes}`}>
          {statusInfo.icon}
          {statusInfo.label}
        </span>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-5">
        {STEPS.map((step, i) => (
          <div key={step.status} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                  i <= currentIdx
                    ? 'bg-sage text-white shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]'
                    : 'bg-canvas border-2 border-border text-muted'
                }`}
              >
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
              <div
                className={`flex-1 h-0.5 mx-2 -mt-5 rounded-full transition-colors ${
                  i < currentIdx ? 'bg-sage' : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 ${
          message.type === 'success'
            ? 'bg-mint border border-sage/30'
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
          )}
          <p className={`text-xs ${message.type === 'success' ? 'text-sage-dark' : 'text-red-700'}`}>{message.text}</p>
        </div>
      )}

      {/* Manifest detail + QR */}
      <div className="flex gap-4 mb-5 p-4 bg-canvas/50 rounded-xl border border-border">
        <div className="flex-1 space-y-2.5 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-muted">No. Manifest</span>
            <span className="text-ink font-extrabold font-mono tracking-tight">{manifest.manifest_no}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Diterbitkan</span>
            <span className="text-ink tabular-nums">
              {new Date(manifest.created_at).toLocaleString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          {manifest.attended_at && (
            <div className="flex justify-between gap-3">
              <span className="text-muted">Kehadiran</span>
              <span className="text-ink tabular-nums">
                {new Date(manifest.attended_at).toLocaleString('id-ID', {
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          )}
          {manifest.recycler_confirmed_at && (
            <div className="flex justify-between gap-3">
              <span className="text-muted">Pickup tercatat</span>
              <span className="text-ink tabular-nums">
                {new Date(manifest.recycler_confirmed_at).toLocaleString('id-ID', {
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          )}
          {manifest.company_confirmed_at && (
            <div className="flex justify-between gap-3">
              <span className="text-muted">Dikonfirmasi</span>
              <span className="text-ink tabular-nums">
                {new Date(manifest.company_confirmed_at).toLocaleString('id-ID', {
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        {role === 'company' && <ManifestQr payload={manifest.qr_code} />}
      </div>

      {/* Pickup evidence */}
      {data.pickupRecord && (
        <div className="mb-4 p-4 bg-sky-50 border border-sky-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-4 h-4 text-sky-700" strokeWidth={2} />
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-sky-700">
              Bukti Pickup Recycler
            </p>
          </div>
          <p className="text-xs text-ink">
            <span className="text-sky-800">Berat bersih: </span>
            <span className="font-extrabold tracking-tight">
              {data.pickupRecord.net_weight_kg.toLocaleString('id-ID')} kg
            </span>
          </p>
          {photoUrls.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {photoUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden ring-1 ring-sky-200 hover:ring-sky-400 transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Certificate */}
      {data.certificate && (
        <div className="mb-4 bg-gradient-to-br from-mint via-sage/10 to-surface border border-sage/30 rounded-xl p-4 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sage/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-10 h-10 rounded-lg bg-sage text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]">
                <BadgeCheck className="w-5 h-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-sage-dark mb-1">
                  Sertifikat Daur Ulang Terbit
                </p>
                <p className="text-sm text-ink font-extrabold tracking-tight">
                  {formatMass(data.certificate.weight_kg, data.certificate.ef_unit)}
                </p>
                <p className="text-xs text-sage-dark mt-0.5 font-semibold">
                  ≈ {data.certificate.co2e_avoided_kg.toLocaleString('id-ID')} kg CO₂e terhindar
                </p>
                {data.certificate.virgin_ef_kg_co2e != null &&
                  data.certificate.recycled_ef_kg_co2e != null && (
                    <p className="text-[11px] text-muted mt-1 tabular-nums">
                      EF: {data.certificate.virgin_ef_kg_co2e} − {data.certificate.recycled_ef_kg_co2e} kg CO₂e/{efLabel(data.certificate.ef_unit)}
                    </p>
                  )}
                {data.certificate.ef_source && (
                  <p className="text-[10px] text-muted mt-0.5">
                    Sumber: {data.certificate.ef_source}
                  </p>
                )}
              </div>
            </div>
            <a
              href={data.certificate.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 px-3 py-2 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
              PDF
            </a>
          </div>
        </div>
      )}

      {/* Recycler info messages */}
      {role === 'recycler' && manifest.status === 'issued' && !manifest.attended_at && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-0.5">Kehadiran belum tercatat</p>
            <p className="text-xs text-amber-800 leading-relaxed">
              Pindai QR yang ditampilkan perusahaan di lokasi pickup untuk mencatat kehadiran, lalu kembali ke halaman ini.
            </p>
          </div>
        </div>
      )}

      {role === 'recycler' && manifest.status === 'issued' && manifest.attended_at && (
        <button
          onClick={() => setRecordModalOpen(true)}
          disabled={busy}
          className="group w-full bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(14,165,233,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
        >
          <Camera className="w-4 h-4" strokeWidth={2.5} />
          Catat Pickup (Berat + Foto Bukti)
        </button>
      )}

      {role === 'company' && manifest.status === 'pickup_recorded' && (
        <button
          onClick={handleConfirm}
          disabled={busy}
          className="group w-full bg-sage hover:bg-sage-dark text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Memproses...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Konfirmasi Transaksi & Selesaikan
            </>
          )}
        </button>
      )}

      {role === 'company' && manifest.status === 'confirmed' && (
        <button
          onClick={handleIssueCertificate}
          disabled={busy}
          className="group w-full bg-gradient-to-r from-sage to-sage-dark hover:from-sage-dark hover:to-sage text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Menerbitkan...
            </>
          ) : (
            <>
              <BadgeCheck className="w-4 h-4" strokeWidth={2.5} />
              Terbitkan Sertifikat
            </>
          )}
        </button>
      )}

      {recordModalOpen && (
        <RecordPickupModal
          manifestId={manifest.id}
          onClose={() => setRecordModalOpen(false)}
          onSuccess={async () => {
            setRecordModalOpen(false)
            setMessage({ type: 'success', text: 'Pickup dicatat! Menunggu konfirmasi company.' })
            await load()
            onChanged?.()
          }}
        />
      )}
    </div>
  )
}

function ManifestQr({ payload }: { payload: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const verifyUrl = `${window.location.origin}/verify/manifest/${payload}`
    QRCode.toDataURL(verifyUrl, { width: 160, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [payload])

  if (!dataUrl) {
    return <Skeleton className="w-[88px] h-[88px] rounded-xl" />
  }

  return (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
      <div className="p-2 bg-white rounded-xl border border-border shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt={`QR ${payload}`}
          className="w-[88px] h-[88px]"
        />
      </div>
      <span className="text-[9px] font-bold tracking-wider uppercase text-muted">
        QR Kehadiran
      </span>
    </div>
  )
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SchedulePickupModal({
  listingId,
  materialLabel,
  defaultAddress,
  defaultScheduledAt,
  onClose,
  onSuccess,
}: {
  listingId: string
  materialLabel: string
  defaultAddress: string
  defaultScheduledAt?: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [scheduledAt, setScheduledAt] = useState(
    defaultScheduledAt ? toLocalInputValue(defaultScheduledAt) : '',
  )
  const [pickupAddress, setPickupAddress] = useState(defaultAddress)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.append('listing_id', listingId)
    formData.append('scheduled_at', scheduledAt)
    if (pickupAddress) formData.append('pickup_address', pickupAddress)
    if (note) formData.append('pickup_note', note)

    const result = await confirmPickupSchedule(formData)
    setLoading(false)

    if (result.error) {
      setError(result.error as string)
      toast.error(result.error as string)
      return
    }

    toast.success('Pickup dijadwalkan — manifest & QR terbit!')
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-[22px] max-w-md w-full overflow-hidden shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)]">
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-surface rounded-t-[22px]">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block mb-0.5">
                Jadwal Pickup
              </span>
              <h2 className="text-base font-extrabold text-ink tracking-tight">Atur Waktu Jemput</h2>
              <p className="text-xs text-muted mt-0.5 truncate">{materialLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Tanggal & Jam Pickup
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            />
            <p className="text-[11px] text-muted mt-1.5">Pilih waktu kapan recycler akan menjemput material</p>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Alamat Pickup
            </label>
            <input
              type="text"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder="Alamat lokasi material"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Catatan <span className="text-muted font-normal">(opsional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all resize-none"
              rows={2}
              placeholder="Petunjuk akses lokasi, kontak, dll."
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 border border-border hover:border-sage hover:text-sage-dark text-ink py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="group flex-1 bg-sage hover:bg-sage-dark text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  {defaultScheduledAt ? 'Perbarui Jadwal' : 'Konfirmasi Pickup'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RecordPickupModal({
  manifestId,
  onClose,
  onSuccess,
}: {
  manifestId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [weight, setWeight] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.append('manifest_id', manifestId)
    formData.append('net_weight_kg', weight)
    for (const photo of photos) formData.append('photos', photo)

    const result = await recordPickup(formData)
    setLoading(false)

    if (result.error) {
      setError(result.error as string)
      toast.error(result.error as string)
      return
    }
    toast.success('Pickup berhasil dicatat')
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-[22px] max-w-md w-full overflow-hidden shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)]">
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-surface rounded-t-[22px]">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-10 h-10 rounded-lg bg-sky-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_8px_-4px_rgba(14,165,233,0.4)]">
              <Camera className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sky-700 block mb-0.5">
                Catat Pickup
              </span>
              <h2 className="text-base font-extrabold text-ink tracking-tight">Berat & Bukti Foto</h2>
              <p className="text-xs text-muted mt-0.5">Isi saat material dijemput</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Berat Bersih (kg)
            </label>
            <input
              type="number"
              required
              min="0.1"
              step="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder="Contoh: 125.5"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Foto Bukti <span className="text-muted font-normal">(opsional)</span>
            </label>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) =>
                setPhotos(Array.from(e.target.files ?? []).slice(0, 5))
              }
              className="w-full text-sm text-ink file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-sage/20 file:text-sage-dark file:text-xs file:font-bold file:tracking-wider file:uppercase hover:file:bg-sage/30 file:cursor-pointer"
            />
            {photos.length > 0 && (
              <p className="text-[11px] text-muted mt-2 flex items-center gap-1.5">
                <Check className="w-3 h-3" strokeWidth={2.5} />
                {photos.length} foto siap diunggah
              </p>
            )}
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 border border-border hover:border-sage hover:text-sage-dark text-ink py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="group flex-1 bg-sage hover:bg-sage-dark text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  Simpan Catatan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CertificateDocument({
  manifestNo,
  companyName,
  recyclerName,
  materialType,
  weightKg,
  co2eAvoidedKg,
  virginEfKgCo2e,
  recycledEfKgCo2e,
  efUnit,
  efSource,
  issuedAt,
  renderer,
}: {
  manifestNo: string
  companyName: string
  recyclerName: string
  materialType: string
  weightKg: number
  co2eAvoidedKg: number
  virginEfKgCo2e: number | null
  recycledEfKgCo2e: number | null
  efUnit: string
  efSource: string | null
  issuedAt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: any
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const R = renderer as any
  const unit = efUnit === 'tonne' ? 'tonne' : 'kg'
  const weightLabel =
    efUnit === 'tonne'
      ? `${Math.round((weightKg / 1000) * 100) / 100} ${unit}`
      : `${weightKg} ${unit}`
  const efPerUnit = efUnit === 'tonne' ? 'kg CO2e/tonne' : 'kg CO2e/kg'

  const SAGE = '#559E7B'
  const SAGE_DARK = '#3D7A5D'

  const styles = R.StyleSheet.create({
    page: { padding: 48, fontSize: 11, fontFamily: 'Helvetica', color: '#0B1F16' },
    header: { borderBottom: `2pt solid ${SAGE}`, paddingBottom: 12, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerLeft: {},
    brand: { fontSize: 20, fontWeight: 'bold', color: SAGE_DARK, letterSpacing: 0.5 },
    subtitle: { fontSize: 9, color: '#6b7280', marginTop: 2 },
    headerRight: { textAlign: 'right' },
    manifestLabel: { fontSize: 8, color: '#9ca3af', fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase' },
    manifestNo: { fontSize: 10, fontWeight: 'bold', color: '#0B1F16', fontFamily: 'Courier', marginTop: 2 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#0B1F16', marginBottom: 4, letterSpacing: 0.3 },
    titleSub: { fontSize: 10, color: '#6b7280', marginBottom: 28, lineHeight: 1.5 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '0.5pt solid #e5e7eb' },
    rowLast: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    label: { color: '#6b7280', fontSize: 10 },
    value: { fontWeight: 'bold', fontSize: 11 },
    box: {
      backgroundColor: '#E8F5EE',
      border: `1pt solid ${SAGE}`,
      borderRadius: 6,
      padding: 20,
      marginTop: 16,
      marginBottom: 24,
    },
    co2Label: { fontSize: 9, color: SAGE_DARK, fontWeight: 'bold', letterSpacing: 1.2, textAlign: 'center', marginBottom: 6 },
    co2: { fontSize: 24, fontWeight: 'bold', color: SAGE_DARK, textAlign: 'center', marginBottom: 8 },
    co2Note: { fontSize: 8, color: '#6b7280', textAlign: 'center', lineHeight: 1.4 },
    footer: { position: 'absolute', bottom: 40, left: 48, right: 48, fontSize: 7.5, color: '#9ca3af', borderTop: '1pt solid #e5e7eb', paddingTop: 10, lineHeight: 1.5 },
  })

  return (
    <R.Document>
      <R.Page size="A4" style={styles.page}>
        <R.View style={styles.header}>
          <R.View style={styles.headerLeft}>
            <R.Text style={styles.brand}>ECOPLY</R.Text>
            <R.Text style={styles.subtitle}>Platform Daur Ulang & Pelacakan Emisi</R.Text>
          </R.View>
          <R.View style={styles.headerRight}>
            <R.Text style={styles.manifestLabel}>No. Manifest</R.Text>
            <R.Text style={styles.manifestNo}>{manifestNo}</R.Text>
          </R.View>
        </R.View>

        <R.Text style={styles.title}>SERTIFIKAT DAUR ULANG</R.Text>
        <R.Text style={styles.titleSub}>
          Dengan ini menyatakan bahwa material telah berhasil didaur ulang dan tercatat dalam sistem ECOPLY,{'\n'}
          berkontribusi pada pengurangan emisi gas rumah kaca.
        </R.Text>

        <R.View style={styles.row}>
          <R.Text style={styles.label}>Perusahaan Pengirim</R.Text>
          <R.Text style={styles.value}>{companyName || '-'}</R.Text>
        </R.View>
        <R.View style={styles.row}>
          <R.Text style={styles.label}>Recycler Penerima</R.Text>
          <R.Text style={styles.value}>{recyclerName || '-'}</R.Text>
        </R.View>
        <R.View style={styles.row}>
          <R.Text style={styles.label}>Jenis Material</R.Text>
          <R.Text style={styles.value}>{materialType || '-'}</R.Text>
        </R.View>
        <R.View style={styles.row}>
          <R.Text style={styles.label}>Berat Didaur Ulang</R.Text>
          <R.Text style={styles.value}>{weightLabel}</R.Text>
        </R.View>
        <R.View style={styles.rowLast}>
          <R.Text style={styles.label}>Tanggal Terbit</R.Text>
          <R.Text style={styles.value}>
            {new Date(issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </R.Text>
        </R.View>

        <R.View style={styles.box}>
          <R.Text style={styles.co2Label}>TOTAL EMISI TERHINDAR</R.Text>
          <R.Text style={styles.co2}>
            ~ {Math.round(co2eAvoidedKg).toLocaleString('id-ID')} kg CO2e
          </R.Text>
          <R.Text style={styles.co2Note}>
            {virginEfKgCo2e != null && recycledEfKgCo2e != null
              ? `Dihitung dari (EF virgin ${virginEfKgCo2e} - EF daur ulang ${recycledEfKgCo2e} ${efPerUnit}) × ${weightLabel}${
                  efSource ? ` — Sumber: ${efSource}` : ''
                }`
              : 'Faktor emisi material tidak tersedia'}
          </R.Text>
        </R.View>

        <R.Text style={styles.footer}>
          Dokumen ini diterbitkan otomatis oleh ECOPLY. Verifikasi keaslian melalui QR pada manifest
          terkait di {typeof window !== 'undefined' ? window.location.origin : 'ECOPLY'}.
          {'\n'}Estimasi CO2e terhindar dihitung sebagai berat daur ulang × (EF material virgin - EF material daur ulang),
          mengikuti pendekatan avoided emissions sesuai standar GHG Protocol.
        </R.Text>
      </R.Page>
    </R.Document>
  )
}