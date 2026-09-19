'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { setupRecyclerProfile } from '@/lib/supabase/actions/auth'
import type { RecyclerOnboardingInput } from '@/lib/validators/auth'
import MapSelector, { MapSelectorHandle } from '@/components/mapbox/MapSelector'
import IdNumberInput from '@/components/ui/IdNumberInput'
import { isValidNpwp, isValidNib } from '@/lib/utils/idnumbers'
import { Loader2, MapPin, AlertTriangle, ArrowRight } from 'lucide-react'

const inputCls =
  'w-full px-4 py-3 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all'

const labelCls = 'block text-xs font-semibold text-ink uppercase tracking-wider mb-2'

export default function RecyclerOnboardingForm() {
  const mapSelectorRef = useRef<MapSelectorHandle | null>(null)
  const [loadingPhase, setLoadingPhase] = useState<
    'idle' | 'geolocating' | 'fetching-address'
  >('idle')
  const [geoError, setGeoError] = useState<string | null>(null)

  const [form, setForm] = useState<RecyclerOnboardingInput>({
    name: '',
    address: '',
    npwp: '',
    nib: '',
    capacityKgPerMonth: undefined,
    location_lat: undefined,
    location_lng: undefined,
    address_text: '',
    service_radius_km: 50,
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAutoDetect = async () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation tidak didukung browser ini.')
      return
    }

    setLoadingPhase('geolocating')
    setGeoError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })

      const { latitude, longitude } = position.coords
      setLoadingPhase('fetching-address')

      if (mapSelectorRef.current) {
        await mapSelectorRef.current.flyTo(latitude, longitude)
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const msg = err?.message || 'Pastikan izin lokasi browser diberikan'
      setGeoError(`Gagal mendeteksi lokasi: ${msg}`)
    } finally {
      setLoadingPhase('idle')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValidNpwp(form.npwp || '')) {
      setError('Format NPWP tidak valid (15 atau 16 digit).')
      return
    }

    if (!isValidNib(form.nib || '')) {
      setError('NIB harus terdiri dari 13 digit angka.')
      return
    }

    setLoading(true)
    const result = await setupRecyclerProfile(form)
    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
      setLoading(false)
    }
  }

  const isAutoDetectBusy = loadingPhase !== 'idle'

  return (
    <div className="bg-surface rounded-[18px] shadow-[0_24px_48px_-12px_rgba(11,31,22,0.08)] border border-border p-8 sm:p-10">

      {/* Color-split headline */}
      <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
        Profil <span className="text-sage">Fasilitas.</span>
      </h2>
      <p className="mt-3 text-sm text-muted mb-8">
        Data ini digunakan untuk proses verifikasi
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className={labelCls}>
            Nama Fasilitas <span className="text-sage-dark">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputCls}
            placeholder="Nama fasilitas daur ulang"
          />
        </div>

        {/* Location Picker - Langsung pakai MapSelector */}
        <div>
          <div className="flex items-center justify-between mb-2 gap-3">
            <label className="text-xs font-semibold text-ink uppercase tracking-wider">
              Lokasi Fasilitas <span className="text-sage-dark">*</span>
            </label>
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={isAutoDetectBusy}
              className="px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-semibold text-sage-dark hover:border-sage hover:text-sage disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors flex-shrink-0"
            >
              {isAutoDetectBusy ? (
                <>
                  <Loader2 className="animate-spin h-3 w-3" />
                  <span>
                    {loadingPhase === 'geolocating' ? 'Mendeteksi...' : 'Mengambil alamat...'}
                  </span>
                </>
              ) : (
                <>
                  <MapPin className="w-3 h-3" />
                  Auto-detect lokasi
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-muted mb-2 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-sage" />
            Klik di peta untuk memilih lokasi fasilitas Anda
          </p>

          <div className="border border-border rounded-xl overflow-hidden shadow-[0_16px_32px_-16px_rgba(11,31,22,0.12)]">
            <MapSelector
              ref={mapSelectorRef}
              initialLat={-6.2}
              initialLng={106.816666}
              loadingPhase={loadingPhase}
              onSelect={(lat, lng, address) => {
                setForm((f) => ({
                  ...f,
                  location_lat: lat,
                  location_lng: lng,
                  address_text: address || '',
                }))
              }}
            />
          </div>

          <input
            id="address"
            type="text"
            readOnly
            value={form.address_text || ''}
            placeholder="Alamat otomatis terisi dari lokasi yang dipilih di peta"
            className="mt-2 w-full px-4 py-3 border border-border rounded-xl text-sm bg-canvas/60 text-muted cursor-not-allowed focus:outline-none"
          />

          {geoError && (
            <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{geoError}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="radius" className={labelCls}>
              Radius Layanan
            </label>
            <div className="relative">
              <input
                id="radius"
                type="number"
                min={1}
                max={1000}
                value={form.service_radius_km ?? 50}
                onChange={(e) =>
                  setForm((f) => ({ ...f, service_radius_km: Number(e.target.value) || 50 }))
                }
                className={`${inputCls} pr-12`}
                placeholder="50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted pointer-events-none">
                km
              </span>
            </div>
            <p className="text-xs text-muted mt-1.5 flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-sage" />
              Jarak maksimum untuk pickup limbah
            </p>
          </div>

          <div>
            <label htmlFor="capacity" className={labelCls}>
              Kapasitas
            </label>
            <div className="relative">
              <input
                id="capacity"
                type="number"
                min={0}
                value={form.capacityKgPerMonth ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    capacityKgPerMonth: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className={`${inputCls} pr-20`}
                placeholder="Contoh: 10000"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted pointer-events-none">
                kg/bulan
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <IdNumberInput
            kind="npwp"
            label="NPWP"
            value={form.npwp}
            onChange={(v) => setForm((f) => ({ ...f, npwp: v }))}
            required
            size="lg"
          />

          <IdNumberInput
            kind="nib"
            label="NIB"
            value={form.nib}
            onChange={(v) => setForm((f) => ({ ...f, nib: v }))}
            required
            size="lg"
          />
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group w-full bg-sage hover:bg-sage-dark text-white py-3.5 px-4 rounded-full text-sm font-semibold tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Menyimpan...
            </>
          ) : (
            <>
              Simpan & Lanjutkan
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>
    </div>
  )
}