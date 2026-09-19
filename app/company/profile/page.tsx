/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  getCompanyProfile,
  updateCompanyProfile,
} from '@/lib/supabase/actions/company'
import { INDUSTRY_OPTIONS, OTHER_INDUSTRY_VALUE } from '@/lib/constants/industries'
import MapSelector, {
  MapSelectorHandle,
} from '@/components/mapbox/MapSelector'
import type { Certification } from '@/lib/validators/company'
import { parsePostGISLocation } from '@/lib/utils/postgis'
import { stripDigits, isValidNik, isValidNpwp, isValidNib } from '@/lib/utils/idnumbers'
import IdNumberInput from '@/components/ui/IdNumberInput'
import { SkeletonHero, SkeletonProfile } from '@/components/ui/skeletons'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building,
  Check,
  Clock,
  Download,
  Eye,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Trash2,
  UploadCloud,
  User,
  X,
} from 'lucide-react'

export default function CompanyProfilePage() {
  const router = useRouter()
  const mapSelectorRef = useRef<MapSelectorHandle | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [viewingCert, setViewingCert] = useState<Certification | null>(null)
  const [loadingPhase, setLoadingPhase] = useState<
    'idle' | 'geolocating' | 'fetching-address'
  >('idle')
  const [customIndustry, setCustomIndustry] = useState('')

  const [formData, setFormData] = useState({
    full_name: '',
    name: '',
    segment: '',
    industry: '',
    npwp: '',
    nib: '',
    nik: '',
    address_text: '',
    certifications: [] as Certification[],
    pending_certs: [] as { name: string; file: File }[],
    _geo_lat: undefined as number | undefined,
    _geo_lng: undefined as number | undefined,
  })

  useEffect(() => {
    async function load() {
      const { data, error } = await getCompanyProfile()
      if (error) {
        setError(error)
        setLoading(false)
        return
      }

      if (data) {
        let lat = -6.2
        let lng = 106.816666
        const coords = parsePostGISLocation(data.location)
        if (coords) {
          lat = coords.lat
          lng = coords.lng
        }

        const industry = data.industry || ''
        const known = INDUSTRY_OPTIONS.some((o) => o.value === industry)
        setCustomIndustry(known || !industry ? '' : industry)

        const raw = data as any

        setFormData({
          full_name: data.full_name || '',
          name: data.name || '',
          segment: raw.segment || '',
          industry: known ? industry : industry ? OTHER_INDUSTRY_VALUE : '',
          npwp: stripDigits(data.npwp) || '',
          nib: stripDigits(raw.nib) || '',
          nik: stripDigits(raw.nik) || '',
          address_text: data.address_text || '',
          certifications: (data.certifications || []) as Certification[],
          pending_certs: [],
          _geo_lat: lat,
          _geo_lng: lng,
        })
      }

      setLoading(false)
    }
    load()
  }, [])

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setFormData((prev) => ({
      ...prev,
      _geo_lat: lat,
      _geo_lng: lng,
      address_text: address || '',
    }))
  }

  const handleAutoDetect = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung browser ini.')
      return
    }

    setLoadingPhase('geolocating')
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          })
        },
      )

      const { latitude, longitude } = position.coords
      setLoadingPhase('fetching-address')

      if (mapSelectorRef.current) {
        await mapSelectorRef.current.flyTo(latitude, longitude)
      }
    } catch (err: any) {
      console.error('Gagal deteksi lokasi:', err)
      const msg = err?.message || 'Pastikan izin lokasi browser diberikan'
      setError(`Gagal mendeteksi lokasi: ${msg}`)
    } finally {
      setLoadingPhase('idle')
    }
  }

  const addPendingCert = (name: string, file: File) => {
    if (formData.pending_certs.length + formData.certifications.length >= 10) {
      setError('Maksimal 10 sertifikasi')
      return
    }
    setFormData((prev) => ({
      ...prev,
      pending_certs: [...prev.pending_certs, { name, file }],
    }))
  }

  const removePendingCert = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      pending_certs: prev.pending_certs.filter((_, i) => i !== index),
    }))
  }

  const removeExistingCert = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (formData._geo_lat === undefined || formData._geo_lng === undefined) {
      setError('Silakan pilih lokasi perusahaan di peta.')
      return
    }

    if (!formData.name.trim()) {
      setError('Nama perusahaan wajib diisi.')
      return
    }

    if (
      !formData.industry.trim() ||
      (formData.industry === OTHER_INDUSTRY_VALUE && !customIndustry.trim())
    ) {
      setError('Jenis industri wajib diisi.')
      return
    }

    if (formData.segment === 'umkm') {
      if (!isValidNik(formData.nik)) {
        setError('NIK wajib diisi untuk UMKM (16 digit).')
        return
      }
    } else {
      if (!isValidNpwp(formData.npwp)) {
        setError('Format NPWP tidak valid (15 atau 16 digit).')
        return
      }

      if (!isValidNib(formData.nib)) {
        setError('NIB harus terdiri dari 13 digit angka.')
        return
      }
    }

    if (!formData.address_text?.trim()) {
      setError('Alamat wajib diisi — pilih lokasi di peta.')
      return
    }

    if (formData.pending_certs.some((c) => !c.name.trim())) {
      setError('Nama sertifikasi belum diisi untuk semua file.')
      return
    }

    setSaving(true)

    const extraFormData = new FormData()
    extraFormData.append('name', formData.name.trim())
    if (formData.segment) {
      extraFormData.append('segment', formData.segment)
    }
    extraFormData.append(
      'industry',
      formData.industry === OTHER_INDUSTRY_VALUE
        ? customIndustry.trim()
        : formData.industry,
    )
    extraFormData.append('npwp', formData.npwp?.trim())
    extraFormData.append('nib', formData.nib?.trim())
    extraFormData.append('nik', formData.nik?.trim())
    extraFormData.append('location_lat', String(formData._geo_lat))
    extraFormData.append('location_lng', String(formData._geo_lng))
    if (formData.address_text) {
      extraFormData.append('address_text', formData.address_text)
    }
    extraFormData.append('full_name', formData.full_name.trim())
    extraFormData.append(
      'certifications',
      JSON.stringify(formData.certifications),
    )

    formData.pending_certs.forEach((c) => {
      extraFormData.append('cert_files', c.file)
      extraFormData.append('cert_names', c.name)
    })

    const result = await updateCompanyProfile(extraFormData)
    setSaving(false)

    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
      return
    }

    if (result?.reopened) {
      setSuccess(
        'Profil diperbarui. Akun dikirim kembali untuk ditinjau admin.',
      )
      toast.success('Profil diperbarui. Akun dikirim kembali untuk ditinjau admin.')
      setTimeout(() => router.push('/verify/blocked'), 1400)
      return
    }

    const { data: refreshedData } = await getCompanyProfile()
    if (refreshedData) {
      setFormData((prev) => ({
        ...prev,
        certifications: (refreshedData.certifications || []) as Certification[],
        pending_certs: [],
      }))
    }

    setSuccess('Profil perusahaan berhasil disimpan.')
    toast.success('Profil perusahaan berhasil disimpan.')
    router.refresh()
  }

  const isAutoDetectBusy = loadingPhase !== 'idle'

  const segmentLabel: Record<string, string> = {
    umkm: 'UMKM',
    non_umkm: 'Perusahaan (Menengah & Besar)',
  }

  const industryLabel = INDUSTRY_OPTIONS.find(
    (o) => o.value === formData.industry,
  )?.label

  if (loading) {
    return (
      <div className="animate-fade-in">
        <SkeletonHero />
        <div className="space-y-6">
          <SkeletonProfile />
          <SkeletonProfile />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Hero Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
          Profil <span className="text-sage">Perusahaan.</span>
        </h1>
        <p className="mt-3 text-sm text-muted max-w-2xl">
          Informasi ini digunakan untuk proses verifikasi dan aktivitas Anda di ECOPLY. Pastikan data akurat untuk kelancaran audit.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-red-900">Error</p>
            <p className="text-xs text-red-800 mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="mb-6 bg-mint border border-sage/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-sm font-semibold text-sage-dark">Berhasil</p>
            <p className="text-xs text-sage-dark mt-0.5 leading-relaxed">{success}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* === 02 — DATA AKUN === */}
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
                Data Akun
              </span>
              <p className="text-xs text-muted mt-0.5">Identitas pemilik akun</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, full_name: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder="Nama lengkap"
            />
          </div>
        </div>

        {/* === 03 — PROFIL PERUSAHAAN === */}
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
              <Building className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
                Profil Perusahaan
              </span>
              <p className="text-xs text-muted mt-0.5">Informasi bisnis utama</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Nama Perusahaan <span className="text-sage-dark">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                placeholder="PT. Nama Perusahaan"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Segmen Usaha
              </label>
              <input
                type="text"
                readOnly
                value={
                  formData.segment
                    ? (segmentLabel[formData.segment] ?? formData.segment)
                    : ''
                }
                placeholder="Belum diatur"
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-muted cursor-not-allowed"
              />
              <p className="text-[10px] text-muted mt-1.5 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Ditentukan saat onboarding, tidak dapat diubah
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Industri
              </label>
              <input
                type="text"
                readOnly
                value={
                  formData.industry === OTHER_INDUSTRY_VALUE
                    ? customIndustry || 'Lainnya / Sektor Tidak Terdaftar'
                    : (industryLabel || formData.industry)
                }
                placeholder="Belum diatur"
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-muted cursor-not-allowed"
              />
              <p className="text-[10px] text-muted mt-1.5 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Ditentukan saat onboarding, tidak dapat diubah
              </p>
            </div>

            <IdNumberInput
              kind="npwp"
              label="NPWP"
              value={formData.npwp}
              onChange={(v) =>
                setFormData((prev) => ({ ...prev, npwp: v }))
              }
              required={formData.segment !== 'umkm'}
              optionalHint={
                formData.segment === 'umkm' ? 'opsional untuk UMKM' : undefined
              }
              size="md"
            />

            <IdNumberInput
              kind="nib"
              label="NIB"
              value={formData.nib}
              onChange={(v) =>
                setFormData((prev) => ({ ...prev, nib: v }))
              }
              required={formData.segment !== 'umkm'}
              optionalHint={
                formData.segment === 'umkm' ? 'opsional untuk UMKM' : undefined
              }
              size="md"
            />

            {(formData.segment === 'umkm' || formData.nik) && (
              <IdNumberInput
                kind="nik"
                label="NIK"
                value={formData.nik}
                onChange={(v) =>
                  setFormData((prev) => ({ ...prev, nik: v }))
                }
                required={formData.segment === 'umkm'}
                optionalHint={
                  formData.segment !== 'umkm' ? 'opsional' : undefined
                }
                size="md"
              />
            )}
          </div>
        </div>

        {/* === 04 — LOKASI PERUSAHAAN === */}
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
                  Lokasi Perusahaan
                </span>
                <p className="text-xs text-muted mt-0.5">Klik peta atau gunakan Auto-Detect</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={isAutoDetectBusy}
              className="group inline-flex items-center gap-2 px-4 py-2 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex-shrink-0"
            >
              {isAutoDetectBusy && (
                <Loader2 className="animate-spin w-3.5 h-3.5" />
              )}
              {loadingPhase === 'geolocating'
                ? 'Mendeteksi...'
                : loadingPhase === 'fetching-address'
                  ? 'Mengambil alamat...'
                  : 'Auto-Detect'}
            </button>
          </div>

          <div className="mt-4 border border-border rounded-[18px] overflow-hidden shadow-inner">
            <MapSelector
              ref={mapSelectorRef}
              initialLat={formData._geo_lat || -6.2}
              initialLng={formData._geo_lng || 106.816666}
              loadingPhase={loadingPhase}
              onSelect={handleLocationSelect}
            />
          </div>

          <div className="mt-5">
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Alamat
            </label>
            <input
              type="text"
              readOnly
              value={formData.address_text}
              placeholder="Alamat otomatis terisi dari lokasi yang dipilih di peta"
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-muted cursor-not-allowed"
            />
          </div>
        </div>

        {/* === 05 — SERTIFIKASI === */}
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
              <BadgeCheck className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
                Sertifikasi
              </span>
              <p className="text-xs text-muted mt-0.5">
                Upload dokumen bukti untuk setiap sertifikasi (PDF/JPG/PNG, maks 5MB)
              </p>
            </div>
          </div>

          {/* Existing certifications */}
          {formData.certifications.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-2">
                Sudah Tersimpan
              </p>
              {formData.certifications.map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 bg-canvas border border-border rounded-xl hover:border-sage/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
                    <BadgeCheck className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink tracking-tight truncate">
                      {cert.name}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5 tabular-nums">
                      Disimpan{' '}
                      {new Date(cert.uploaded_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingCert(cert)}
                    className="group inline-flex items-center gap-1 px-3 py-1.5 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5"
                  >
                    Lihat
                    <Eye className="w-3 h-3" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeExistingCert(index)}
                    className="w-9 h-9 rounded-full hover:bg-red-50 text-muted hover:text-red-600 flex items-center justify-center transition-colors"
                    title="Hapus sertifikasi"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pending certifications */}
          {formData.pending_certs.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-amber-800 mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3" strokeWidth={2.5} />
                Akan Diupload Saat Simpan
              </p>
              {formData.pending_certs.map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 bg-amber-50/60 border border-amber-200 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink tracking-tight truncate">
                      {cert.name}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5 truncate">
                      {cert.file.name} · {(cert.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingCert(index)}
                    className="w-9 h-9 rounded-full hover:bg-red-50 text-muted hover:text-red-600 flex items-center justify-center transition-colors"
                    title="Hapus"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <CertificationAdder
            onAdd={addPendingCert}
            disabled={
              formData.pending_certs.length + formData.certifications.length >= 10
            }
          />
        </div>

        {/* === SUBMIT === */}
        <button
          type="submit"
          disabled={saving}
          className="group w-full bg-sage hover:bg-sage-dark text-white py-3.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Menyimpan...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Simpan Profil Perusahaan
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>

      {/* === MODAL: Preview Sertifikasi === */}
      {viewingCert && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-[22px] max-w-2xl w-full overflow-hidden shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)]">
            <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
                  <BadgeCheck className="w-5 h-5" strokeWidth={1.8} />
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
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <button
                type="button"
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
                type="button"
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

// === SUB-COMPONENT: Certification Adder ===
function CertificationAdder({
  onAdd,
  disabled,
}: {
  onAdd: (name: string, file: File) => void
  disabled: boolean
}) {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    if (!name.trim() || !file) return
    onAdd(name.trim(), file)
    setName('')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="pt-5 border-t border-border">
      <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-3">
        Tambah Sertifikasi Baru
      </p>
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama sertifikasi (contoh: ISO 14001, PROPER Hijau)"
          className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all disabled:opacity-50"
          disabled={disabled}
        />

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="cert_file_input_company"
            disabled={disabled}
          />
          <label
            htmlFor="cert_file_input_company"
            className={`flex-1 px-4 py-3 border-2 border-dashed rounded-xl text-sm cursor-pointer text-center transition-all ${
              disabled
                ? 'border-border opacity-50 cursor-not-allowed'
                : file
                  ? 'border-sage bg-mint/20'
                  : 'border-border hover:border-sage/50 hover:bg-canvas'
            }`}
          >
            {file ? (
              <span className="text-sage-dark font-semibold flex items-center justify-center gap-2">
                <Check className="w-4 h-4" strokeWidth={2.5} />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            ) : (
              <span className="text-muted flex items-center justify-center gap-2">
                <UploadCloud className="w-4 h-4" strokeWidth={2} />
                Pilih file bukti (PDF/JPG/PNG, maks 5MB)
              </span>
            )}
          </label>

          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled || !name.trim() || !file}
            className="group px-5 py-3 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Tambah
          </button>
        </div>

        {disabled && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <p className="text-xs text-amber-800 leading-relaxed">
              Maksimal 10 sertifikasi tercapai. Hapus salah satu untuk menambah baru.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}