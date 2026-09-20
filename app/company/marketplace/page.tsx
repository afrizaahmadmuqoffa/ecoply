"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  createWasteListing,
  getCompanyListings,
} from "@/lib/supabase/actions/marketplace";
import { getCompanyProfile } from "@/lib/supabase/actions/company";
import { parsePostGISLocation } from "@/lib/utils/postgis";
import { Skeleton } from "@/components/ui/skeletons";
import Pagination from "@/components/ui/Pagination";
import usePagination from "@/lib/hooks/usePagination";
import MapSelector, { MapSelectorHandle } from "../../../components/mapbox/MapSelector";
import ListingThumbnail from "../../../components/marketplace/ListingThumbnail";
import {
  CATEGORIES,
  getMaterialsForCategory,
  getUnitsForCategory,
} from "@/lib/constants/marketplace";
import { AlertTriangle, ArrowRight, Camera, Check, CheckCircle2, Circle, Clock, List, Loader2, MapPin, MessageCircle, Package, Plus, Search, Upload, Users, Weight, X } from "lucide-react";

type WasteListingStatus =
  | "open"
  | "dealing"
  | "confirmed"
  | "completed"
  | "cancelled";

type WasteListing = {
  id: string;
  material_type: string;
  category: string;
  weight: number;
  unit: string;
  photos: string[];
  free_for_pickup: boolean;
  status: WasteListingStatus;
  location?: { lat: number; lng: number };
  address_text: string;
  is_sorted?: boolean;
  is_cleaned?: boolean;
  is_mixed?: boolean;
  contaminant_note?: string;
  pickup_instructions?: string;
  created_at: string;
};

const STATUS_CONFIG: Record<WasteListingStatus, {
  label: string
  classes: string
  icon: React.ReactNode
}> = {
  open: {
    label: 'Tersedia',
    classes: 'text-sage-dark bg-mint border-sage/30',
    icon: (
      <Check className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  dealing: {
    label: 'Negosiasi',
    classes: 'text-amber-800 bg-amber-50 border-amber-200',
    icon: (
      <Clock className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  confirmed: {
    label: 'Dikonfirmasi',
    classes: 'text-sky-800 bg-sky-50 border-sky-200',
    icon: (
      <Circle className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  completed: {
    label: 'Selesai',
    classes: 'text-muted bg-canvas border-border',
    icon: (
      <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  cancelled: {
    label: 'Dibatalkan',
    classes: 'text-red-700 bg-red-50 border-red-200',
    icon: (
      <X className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
};

// === LISTING CARD ===
function ListingCard({ listing }: { listing: WasteListing }) {
  const status = STATUS_CONFIG[listing.status]
  const criteriaCount =
    (listing.is_sorted ? 1 : 0) +
    (listing.is_cleaned ? 1 : 0) +
    (listing.is_mixed ? 1 : 0)
  const isDealing = listing.status === 'dealing' || listing.status === 'confirmed'

  return (
    <div className="group bg-surface border border-border rounded-[18px] overflow-hidden hover:border-sage/40 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-16px_rgba(11,31,22,0.12)] transition-all">
      {/* Thumbnail */}
      <Link href={`/company/marketplace/${listing.id}`} className="block">
        <ListingThumbnail
          photos={listing.photos || []}
          materialType={listing.material_type}
          category={listing.category}
          className="h-44"
        />
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold text-ink tracking-tight truncate">
              {listing.material_type}
            </h3>
            <p className="text-[11px] text-muted mt-0.5 font-medium">{listing.category}</p>
          </div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-full border flex-shrink-0 ${status.classes}`}>
            {status.icon}
            {status.label}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-muted mb-3 pb-3 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Weight className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="font-bold text-ink tabular-nums">{listing.weight} {listing.unit || 'kg'}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
            <span className="truncate">{listing.address_text}</span>
          </div>
        </div>

        {/* Criteria badges */}
        {criteriaCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {listing.is_sorted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-mint text-sage-dark text-[10px] font-bold tracking-wider uppercase rounded border border-sage/30">
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                Dipilah
              </span>
            )}
            {listing.is_cleaned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-mint text-sage-dark text-[10px] font-bold tracking-wider uppercase rounded border border-sage/30">
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                Dicuci
              </span>
            )}
            {listing.is_mixed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold tracking-wider uppercase rounded border border-amber-200">
                <AlertTriangle className="w-2.5 h-2.5" strokeWidth={3} />
                Campuran
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <div>
            {listing.free_for_pickup ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-sage-dark">
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                Gratis Pickup
              </span>
            ) : (
              <span className="text-xs font-medium text-muted">Berbayar</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isDealing && (
              <Link
                href={`/company/marketplace/${listing.id}/chat`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold rounded-full transition-all hover:-translate-y-0.5"
              >
                <MessageCircle className="w-3 h-3" strokeWidth={2} />
                Chat
              </Link>
            )}
            <Link
              href={`/company/marketplace/${listing.id}`}
              className="group inline-flex items-center gap-1 text-xs font-semibold text-sage-dark hover:text-sage"
            >
              Lihat Detail
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// === CREATE LISTING MODAL ===
function CreateListingModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean
  onClose: () => void
  onCreated: (listing: WasteListing) => void
}) {
  const mapSelectorRef = useRef<MapSelectorHandle | null>(null)
  const [formData, setFormData] = useState({
    category: '',
    material_type: '',
    weight: '',
    unit: 'kg',
    address_text: '',
    pickup_instructions: '',
    is_sorted: false,
    is_cleaned: false,
    is_mixed: false,
    contaminant_note: '',
    free_for_pickup: false,
    _geo_lat: undefined as number | undefined,
    _geo_lng: undefined as number | undefined,
  })
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingPhase, setLoadingPhase] = useState<'idle' | 'geolocating' | 'fetching-address'>('idle')
  const [companyLoc, setCompanyLoc] = useState<{
    lat: number
    lng: number
    address: string
  } | null>(null)
  const [companyLocReady, setCompanyLocReady] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    async function load() {
      setCompanyLocReady(false)
      const { data } = await getCompanyProfile()
      if (cancelled) return
      const coords = data?.location != null ? parsePostGISLocation(data.location) : null
      if (coords) {
        setCompanyLoc({
          lat: coords.lat,
          lng: coords.lng,
          address: data?.address_text || '',
        })
        setFormData((prev) => ({
          ...prev,
          _geo_lat: coords.lat,
          _geo_lng: coords.lng,
          address_text: data?.address_text || prev.address_text,
        }))
      } else {
        setCompanyLoc(null)
      }
      setCompanyLocReady(true)
    }
    load()
    return () => { cancelled = true }
  }, [isOpen])

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setFormData((prev) => ({
      ...prev,
      _geo_lat: lat,
      _geo_lng: lng,
      address_text: address || '',
    }))
  }

  const handleCategoryChange = (category: string) => {
    setFormData({
      ...formData,
      category,
      material_type: '',
      unit: getUnitsForCategory(category)[0] || 'kg',
    })
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (photos.length + files.length > 5) {
      setError('Maksimal 5 foto')
      return
    }
    setPhotos([...photos, ...files.slice(0, 5 - photos.length)])
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  const availableMaterials = getMaterialsForCategory(formData.category)
  const availableUnits = getUnitsForCategory(formData.category)
  const isAutoDetectBusy = loadingPhase !== 'idle'

  const handleAutoDetect = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung browser ini.')
      return
    }
    setLoadingPhase('geolocating')
    setError(null)
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
      console.error('❌ Geolocation GAGAL:', err)
      const msg = err?.message || 'Pastikan izin lokasi browser diberikan'
      setError(`Gagal mendeteksi lokasi: ${msg}`)
    } finally {
      setLoadingPhase('idle')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!formData._geo_lat || !formData._geo_lng) {
      setError('Silakan pilih lokasi di peta atau klik "Auto-Detect".')
      return
    }
    if (!formData.address_text) {
      setError('Alamat belum terisi. Tunggu proses geocoding selesai atau coba Auto-Detect ulang.')
      return
    }
    setLoading(true)
    const form = e.target as HTMLFormElement
    const formDataObj = new FormData(form)
    formDataObj.append('location_lat', formData._geo_lat.toString())
    formDataObj.append('location_lng', formData._geo_lng.toString())
    formDataObj.append('category', formData.category)
    formDataObj.append('material_type', formData.material_type)
    formDataObj.append('unit', formData.unit)
    formDataObj.append('address_text', formData.address_text)
    formDataObj.append('free_for_pickup', formData.free_for_pickup.toString())
    formDataObj.append('is_sorted', formData.is_sorted.toString())
    formDataObj.append('is_cleaned', formData.is_cleaned.toString())
    formDataObj.append('is_mixed', formData.is_mixed.toString())
    photos.forEach((photo) => formDataObj.append('photos', photo))

    const result = await createWasteListing(formDataObj)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      toast.error(result.error)
      return
    }
    toast.success('Listing limbah berhasil dibuat')
    setFormData({
      category: '',
      material_type: '',
      weight: '',
      unit: 'kg',
      address_text: '',
      pickup_instructions: '',
      is_sorted: false,
      is_cleaned: false,
      is_mixed: false,
      contaminant_note: '',
      free_for_pickup: false,
      _geo_lat: undefined,
      _geo_lng: undefined,
    })
    setPhotos([])
    if (result.data) onCreated(result.data as WasteListing)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-[22px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)]">
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-surface rounded-t-[22px] z-10">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-10 h-10 rounded-lg bg-sage text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]">
              <Plus className="w-5 h-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block mb-0.5">
                Buat Listing
              </span>
              <h2 className="text-base font-extrabold text-ink tracking-tight">Listing Limbah Baru</h2>
              <p className="text-xs text-muted mt-0.5">Isi detail material yang ingin Anda daur ulang</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Category + Material */}
          <div className="bg-canvas/40 border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center">
                <List className="w-3.5 h-3.5" strokeWidth={2} />
              </span>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark">
                Informasi Material
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Kategori <span className="text-sage-dark">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              >
                <option value="">Pilih kategori</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Jenis Material <span className="text-sage-dark">*</span>
              </label>
              <select
                required
                disabled={!formData.category}
                value={formData.material_type}
                onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all disabled:bg-canvas disabled:cursor-not-allowed"
              >
                <option value="">
                  {formData.category ? 'Pilih jenis material' : 'Pilih kategori terlebih dahulu'}
                </option>
                {availableMaterials.map((mat) => (
                  <option key={mat} value={mat}>{mat}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                  Berat ({formData.unit || 'kg'}) <span className="text-sage-dark">*</span>
                </label>
                <input
                  type="number"
                  name="weight"
                  required
                  min="0.1"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                  placeholder={formData.unit === 'tonne' ? 'Contoh: 2.5' : 'Contoh: 500'}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                  Unit <span className="text-sage-dark">*</span>
                </label>
                <select
                  name="unit"
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                >
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Material condition */}
          <div className="bg-canvas/40 border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
              </span>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark">
                Kondisi Material
              </span>
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 bg-surface border border-border rounded-xl cursor-pointer hover:border-sage/40 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_sorted}
                  onChange={(e) => setFormData({ ...formData, is_sorted: e.target.checked })}
                  className="w-4 h-4 text-sage border-border rounded focus:ring-sage mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-ink">Sudah dipilah</span>
                  <p className="text-xs text-muted mt-0.5">Material hanya satu jenis, tidak tercampur</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-surface border border-border rounded-xl cursor-pointer hover:border-sage/40 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_cleaned}
                  onChange={(e) => setFormData({ ...formData, is_cleaned: e.target.checked })}
                  className="w-4 h-4 text-sage border-border rounded focus:ring-sage mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-ink">Sudah dibersihkan/dicuci</span>
                  <p className="text-xs text-muted mt-0.5">Bebas kotoran, sisa makanan, atau cairan</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-surface border border-border rounded-xl cursor-pointer hover:border-amber-300 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_mixed}
                  onChange={(e) => setFormData({ ...formData, is_mixed: e.target.checked })}
                  className="w-4 h-4 text-amber-600 border-border rounded focus:ring-amber-500 mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-ink">Tercampur material lain</span>
                  <p className="text-xs text-muted mt-0.5">Ada campuran jenis lain atau kontaminan</p>
                </div>
              </label>
            </div>

            {formData.is_mixed && (
              <div className="mt-3 pt-3 border-t border-border">
                <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                  Detail Campuran / Kontaminan
                </label>
                <textarea
                  name="contaminant_note"
                  value={formData.contaminant_note}
                  onChange={(e) => setFormData({ ...formData, contaminant_note: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200 transition-all resize-none"
                  rows={2}
                  placeholder="Contoh: 20% tercampur kertas label, ada sisa lem"
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div className="bg-canvas/40 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5" strokeWidth={2} />
                </span>
                <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark">
                  Lokasi Pickup
                </span>
              </div>
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
                      {loadingPhase === 'geolocating'
                        ? 'Mendeteksi...'
                        : 'Mengambil alamat...'}
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

            <div className="border border-border rounded-[18px] overflow-hidden shadow-inner">
              {!companyLocReady ? (
                <div className="w-full h-[400px] bg-canvas flex items-center justify-center text-xs text-muted">
                  Menyiapkan lokasi perusahaan...
                </div>
              ) : (
                <MapSelector
                  ref={mapSelectorRef}
                  initialLat={companyLoc?.lat ?? -6.2}
                  initialLng={companyLoc?.lng ?? 106.816666}
                  autoSelectOnLoad={Boolean(companyLoc)}
                  loadingPhase={loadingPhase}
                  onSelect={handleLocationSelect}
                />
              )}
            </div>

            {formData._geo_lat && formData._geo_lng && (
              <div className="mt-3 p-3 bg-mint border border-sage/30 rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-sage-dark flex-shrink-0" strokeWidth={2.5} />
                <p className="text-xs text-sage-dark font-mono font-semibold">
                  Lat: {formData._geo_lat.toFixed(6)}, Lng: {formData._geo_lng.toFixed(6)}
                </p>
              </div>
            )}

            <div className="mt-3">
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Alamat <span className="text-sage-dark">*</span>
              </label>
              <textarea
                name="address_text"
                value={formData.address_text}
                readOnly
                rows={2}
                placeholder="Pilih lokasi di peta untuk mengisi alamat otomatis"
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-muted cursor-not-allowed focus:outline-none resize-none"
              />
            </div>

            <div className="mt-3">
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                Instruksi Pickup <span className="text-muted font-normal">(opsional)</span>
              </label>
              <textarea
                name="pickup_instructions"
                value={formData.pickup_instructions}
                onChange={(e) => setFormData({ ...formData, pickup_instructions: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all resize-none"
                rows={2}
                placeholder="Contoh: Gedung A pintu belakang, hubungi Pak Budi 0812-xxx"
              />
            </div>
          </div>

          {/* Photos */}
          <div className="bg-canvas/40 border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center">
                <Camera className="w-3.5 h-3.5" strokeWidth={2} />
              </span>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark">
                Foto Material <span className="text-muted font-normal">(opsional, maks 5)</span>
              </span>
            </div>

            <input
              type="file"
              id="photo_upload"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="hidden"
            />
            <label
              htmlFor="photo_upload"
              className={`block border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                photos.length > 0 ? 'border-sage bg-mint/20' : 'border-border hover:border-sage/50 hover:bg-surface'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center mx-auto mb-2">
                <Upload className="w-5 h-5 text-sage-dark" strokeWidth={2} />
              </div>
              <p className="text-xs font-semibold text-ink">Klik untuk upload foto limbah</p>
              <p className="text-[11px] text-muted mt-1">JPG, PNG, WebP</p>
            </label>

            {photos.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {photos.map((photo, index) => (
                  <div key={index} className="flex items-center justify-between bg-surface px-3 py-2 rounded-xl border border-border">
                    <span className="text-xs text-ink truncate font-medium">{photo.name}</span>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="w-7 h-7 rounded-full hover:bg-red-50 text-muted hover:text-red-600 flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Free pickup */}
          <label className="flex items-start gap-3 p-4 bg-mint/30 border border-sage/30 rounded-xl cursor-pointer hover:bg-mint/50 transition-colors">
            <input
              type="checkbox"
              id="free_pickup"
              checked={formData.free_for_pickup}
              onChange={(e) => setFormData({ ...formData, free_for_pickup: e.target.checked })}
              className="w-4 h-4 text-sage border-border rounded focus:ring-sage mt-0.5"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-sage-dark">Gratis Pickup untuk Recycler</p>
              <p className="text-xs text-sage-dark/70 mt-0.5">Tidak ada biaya material — recycler hanya perlu datang menjemput</p>
            </div>
          </label>

          {/* Buttons */}
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
                  Memproses...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  Buat Listing
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// === LISTINGS SECTION ===
const STATUS_FILTER_OPTIONS: { value: WasteListingStatus | ""; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "open", label: "Tersedia" },
  { value: "dealing", label: "Negosiasi" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
]

function ListingsSection({ listings }: { listings: WasteListing[] }) {
  const [filters, setFilters] = useState<{
    status: WasteListingStatus | ""
    material: string
  }>({ status: "open", material: "" })

  const filteredListings = listings.filter((listing) => {
    if (filters.status && listing.status !== filters.status) return false
    if (filters.material) {
      const q = filters.material.toLowerCase()
      const matches =
        listing.category.toLowerCase().includes(q) ||
        listing.material_type.toLowerCase().includes(q)
      if (!matches) return false
    }
    return true
  })

  const pag = usePagination(filteredListings)

  return (
    <div>
      {/* Filter bar */}
      <div className="bg-surface border border-border rounded-[18px] p-4 mb-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value as WasteListingStatus | "" })
                pag.goToPage(1)
              }}
              className="w-36 px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Cari Material
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
              <input
                type="text"
                placeholder="Contoh: PET, Kardus..."
                value={filters.material}
                onChange={(e) => {
                  setFilters({ ...filters, material: e.target.value })
                  pag.goToPage(1)
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-border rounded-full text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Listings count */}
      {filteredListings.length > 0 && (
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted mb-3 flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-sage/20 text-sage-dark flex items-center justify-center text-[10px] font-extrabold">
            {filteredListings.length}
          </span>
          Listing ditemukan
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {pag.pageItems.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {filteredListings.length > 0 && (
        <Pagination {...pag} onPageChange={pag.goToPage} />
      )}

      {/* Empty state */}
      {filteredListings.length === 0 && (
        <div className="bg-surface border border-border rounded-[18px] p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-canvas flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-muted" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-bold text-ink">Tidak ada listing yang sesuai</p>
          <p className="text-xs text-muted mt-1">Coba ubah filter atau buat listing baru</p>
        </div>
      )}
    </div>
  )
}

// === MAIN PAGE ===
export default function CompanyMarketplacePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [listings, setListings] = useState<WasteListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await getCompanyListings()
      setListings(data as WasteListing[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {loading ? (
            <div className="animate-fade-in">
              <Skeleton className="h-9 sm:h-10 w-2/3 max-w-md" />
              <Skeleton className="h-4 w-full max-w-xl mt-3" />
            </div>
          ) : (
            <>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
                Pasar <span className="text-sage">Limbah.</span>
              </h1>
              <p className="mt-3 text-sm text-muted max-w-2xl">
                Kelola listing limbah Anda dan temukan recycler terpercaya untuk daur ulang material.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {loading ? (
            <>
              <Skeleton className="h-9 w-32 rounded-full flex-shrink-0" />
              <Skeleton className="h-9 w-36 rounded-full flex-shrink-0" />
            </>
          ) : (
            <>
              <Link
                href="/company/marketplace/recyclers"
                className="group inline-flex items-center gap-2 px-4 py-2.5 border border-border hover:border-sage hover:text-sage-dark text-ink text-xs font-semibold rounded-full transition-all"
              >
                <Users className="w-4 h-4" strokeWidth={2} />
                Cari Recycler
              </Link>
              <button
                onClick={() => setIsModalOpen(true)}
                className="group inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
                Buat Listing
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-surface border border-border rounded-[18px] overflow-hidden"
              >
                <Skeleton className="h-44 w-full rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ListingsSection listings={listings} />
      )}

      <CreateListingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(listing) =>
          setListings((prev) => [
            {
              ...listing,
              location: undefined,
              is_sorted: listing.is_sorted || false,
              is_cleaned: listing.is_cleaned || false,
              is_mixed: listing.is_mixed || false,
            },
            ...prev,
          ])
        }
      />
    </div>
  )
}