'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  getRecyclersNearby,
  getCompanyListings,
  getCompanyRequests,
  createRequestPickup,
} from '@/lib/supabase/actions/marketplace'
import { AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, Clock, Factory, Info, Loader2, MapPin, Maximize, Navigation, Package, Search, Send, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeletons'

type Recycler = {
  recycler_id: string
  recycler_name: string
  logo_url: string | null
  verification_status: string
  accepted_materials: string[]
  capacity_per_month: number | null
  service_radius_km: number | null
  distance_km: number
  certifications: string[] | null
}

type ListingOption = {
  id: string
  material_type: string
  category: string
  weight: number
  unit: string
  status: string
}

type CompanyRequest = {
  id: string
  listing_id: string
  recycler_id: string
  price: number | null
  status: string
  note: string | null
  created_at: string
  waste_listings: {
    id: string
    material_type: string
    category: string
    weight: number
    unit: string
    status: string
  } | null
  recyclers: {
    id: string
    name: string
  } | null
}

const STATUS_CONFIG: Record<string, {
  label: string
  classes: string
  icon: React.ReactNode
}> = {
  pending: {
    label: 'Menunggu',
    classes: 'text-amber-800 bg-amber-50 border-amber-200',
    icon: (
      <Clock className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  accepted: {
    label: 'Diterima',
    classes: 'text-sage-dark bg-mint border-sage/30',
    icon: (
      <Check className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  rejected: {
    label: 'Ditolak',
    classes: 'text-red-700 bg-red-50 border-red-200',
    icon: (
      <X className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  cancelled: {
    label: 'Dibatalkan',
    classes: 'text-muted bg-canvas border-border',
    icon: (
      <X className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
}

function RequestPickupModal({
  isOpen,
  onClose,
  recycler,
  listings,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  recycler: Recycler | null
  listings: ListingOption[]
  onSuccess: () => void
}) {
  const [listingId, setListingId] = useState('')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openListings = listings.filter((l) => l.status === 'open')
  const selectedListing = openListings.find((l) => l.id === listingId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!recycler) { setError('Pilih recycler terlebih dahulu'); return }
    if (!listingId) { setError('Pilih listing yang akan dikirim'); return }
    setLoading(true)

    const formData = new FormData()
    formData.append('listing_id', listingId)
    formData.append('recycler_id', recycler.recycler_id)
    if (price) formData.append('price', price)
    if (note) formData.append('note', note)

    const result = await createRequestPickup(formData)
    setLoading(false)
    if (result.error) { setError(result.error as string); toast.error(result.error as string); return }

    toast.success('Permintaan pickup berhasil dikirim')
    onSuccess()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-[22px] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)]">
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-surface rounded-t-[22px]">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-10 h-10 rounded-lg bg-sage text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]">
              <Send className="w-5 h-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block mb-0.5">
                Kirim Request
              </span>
              <h2 className="text-base font-extrabold text-ink tracking-tight">Request Pickup</h2>
              <p className="text-xs text-muted mt-0.5">Tawarkan listing Anda ke recycler</p>
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

          {recycler && (
            <div className="bg-mint/30 border border-sage/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sage text-white flex items-center justify-center flex-shrink-0 font-extrabold text-sm">
                {recycler.recycler_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-sage-dark">Tujuan</p>
                <p className="text-sm font-bold text-ink tracking-tight truncate">{recycler.recycler_name}</p>
                <p className="text-[11px] text-muted mt-0.5">{recycler.distance_km} km dari lokasi Anda</p>
              </div>
              {recycler.verification_status === 'verified' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-sage/20 text-sage-dark text-[10px] font-bold tracking-wider uppercase rounded-full flex-shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={3} />
                  Verified
                </span>
              )}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Pilih Listing <span className="text-sage-dark">*</span>
            </label>
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            >
              <option value="" disabled>
                {openListings.length === 0 ? 'Tidak ada listing open' : 'Pilih listing'}
              </option>
              {openListings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.material_type} ({l.weight} {l.unit}) — {l.category}
                </option>
              ))}
            </select>
            {selectedListing && (
              <p className="text-[11px] text-muted mt-1.5 flex items-center gap-1.5">
                <Info className="w-3 h-3 text-sage-dark" strokeWidth={2.5} />
                Stok: {selectedListing.weight} {selectedListing.unit} — {selectedListing.category}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Harga Penawaran <span className="text-muted font-normal">(opsional, IDR/kg)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder="Kosongkan jika gratis"
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
              rows={3}
              placeholder="Instruksi pickup, jadwal, dll."
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
              disabled={loading || !recycler || !listingId}
              className="group flex-1 bg-sage hover:bg-sage-dark text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" strokeWidth={2.5} />
                  Kirim Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CompanyRecyclersPage() {
  const [recyclers, setRecyclers] = useState<Recycler[]>([])
  const [listings, setListings] = useState<ListingOption[]>([])
  const [requests, setRequests] = useState<CompanyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRecycler, setSelectedRecycler] = useState<Recycler | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      setSuccessMsg(null)

      const [recyclersRes, listingsRes, requestsRes] = await Promise.all([
        getRecyclersNearby(),
        getCompanyListings(),
        getCompanyRequests(),
      ])

      if (recyclersRes.error) setError(recyclersRes.error as string)
      setRecyclers((recyclersRes.data as Recycler[]) || [])
      setListings(((listingsRes.data || []) as ListingOption[]).filter((l) => l.status === 'open'))
      setRequests((requestsRes.data as CompanyRequest[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = recyclers.filter((r) => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      r.recycler_name.toLowerCase().includes(q) ||
      r.accepted_materials.some((m) => m.toLowerCase().includes(q))
    )
  })

  const materialOptions = Array.from(
    new Set(recyclers.flatMap((r) => r.accepted_materials)),
  )
  const shownMaterials = materialOptions.slice(0, 8)
  const extraMaterials = materialOptions.length - shownMaterials.length

  const nearestRecycler = recyclers.reduce<Recycler | null>((nearest, r) => {
    if (!nearest || r.distance_km < nearest.distance_km) return r
    return nearest
  }, null)

  const GROUP_LOGO_COLORS = [
    'bg-sage/20 text-sage-dark ring-sage/10',
    'bg-amber-50 text-amber-700 ring-amber-100',
    'bg-sky-50 text-sky-700 ring-sky-100',
    'bg-mint/40 text-sage-dark ring-sage/10',
    'bg-rose-50 text-rose-700 ring-rose-100',
  ]

  const groupColor = (name: string) => {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
    return GROUP_LOGO_COLORS[hash % GROUP_LOGO_COLORS.length]
  }

  return (
    <div>
      {/* Back */}
      <Link
        href="/company/marketplace"
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-sage-dark transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
        Kembali ke Marketplace
      </Link>

      {/* Hero */}
      <div className="mb-8">
        {loading ? (
          <div className="animate-fade-in">
            <Skeleton className="h-9 sm:h-10 w-1/2 max-w-sm" />
            <Skeleton className="h-4 w-full max-w-xl mt-3" />
          </div>
        ) : (
          <>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
              Cari <span className="text-sage">Recycler.</span>
            </h1>
            <p className="mt-3 text-sm text-muted max-w-2xl">
              Kirim Request Pickup langsung ke recycler yang jangkauan layanannya mencakup lokasi perusahaan Anda.
            </p>
          </>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-red-900">Error</p>
            <p className="text-xs text-red-800 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 bg-mint border border-sage/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-sm font-semibold text-sage-dark">Berhasil</p>
            <p className="text-xs text-sage-dark mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Recyclers section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          {loading ? (
            <div className="flex items-center gap-2 animate-fade-in">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-5 w-36" />
            </div>
          ) : (
            <h2 className="text-sm font-extrabold text-ink tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-sage/20 text-sage-dark flex items-center justify-center text-[10px] font-extrabold">
                {filtered.length}
              </span>
              Recycler Tersedia
            </h2>
          )}

          <div className="flex-1 max-w-md">
            {loading ? (
              <Skeleton className="h-11 w-full rounded-full" />
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Cari nama recycler atau material..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-full text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                />
              </div>
            )}
          </div>
        </div>

        {/* Material filter chips */}
        {!loading && materialOptions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <button
              onClick={() => setFilter('')}
              className={`px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-full border transition-all ${
                filter === ''
                  ? 'bg-sage border-sage text-white'
                  : 'bg-surface border-border text-muted hover:border-sage/40 hover:text-sage-dark'
              }`}
            >
              Semua
            </button>
            {shownMaterials.map((m) => {
              const active = filter.toLowerCase() === m.toLowerCase()
              return (
                <button
                  key={m}
                  onClick={() => setFilter(active ? '' : m)}
                  className={`px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-full border transition-all ${
                    active
                      ? 'bg-sage border-sage text-white'
                      : 'bg-surface border-border text-muted hover:border-sage/40 hover:text-sage-dark'
                  }`}
                >
                  {m}
                </button>
              )
            })}
            {extraMaterials > 0 && (
              <span className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-full border border-dashed border-border text-muted">
                +{extraMaterials} lainnya
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-surface border border-border rounded-[18px] p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0 pt-1">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    {[0, 1].map((j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-28 rounded-full" />
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((r) => (
              <div
                key={r.recycler_id}
                className="group bg-surface border border-border rounded-[18px] p-5 hover:border-sage/40 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-16px_rgba(11,31,22,0.12)] transition-all"
              >
                <Link
                  href={`/company/marketplace/recyclers/${r.recycler_id}`}
                  className="flex items-start gap-3 mb-4 block"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden ring-4 ${groupColor(r.recycler_name)}`}>
                    {r.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.logo_url} alt={r.recycler_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-extrabold text-xl">
                        {r.recycler_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-extrabold text-ink tracking-tight truncate group-hover:text-sage-dark transition-colors">
                        {r.recycler_name}
                      </p>
                      {nearestRecycler && r.recycler_id === nearestRecycler.recycler_id && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sage text-white text-[10px] font-bold tracking-wider uppercase rounded flex-shrink-0">
                          <Navigation className="w-2.5 h-2.5" strokeWidth={2.5} />
                          Terdekat
                        </span>
                      )}
                      {r.verification_status === 'verified' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-mint text-sage-dark text-[10px] font-bold tracking-wider uppercase rounded border border-sage/30 flex-shrink-0">
                          <Check className="w-2.5 h-2.5" strokeWidth={3} />
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" strokeWidth={2} />
                      {r.distance_km} km dari lokasi Anda
                    </p>
                  </div>
                </Link>

                {r.accepted_materials.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {r.accepted_materials.slice(0, 4).map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 bg-mint/40 text-sage-dark text-[10px] font-bold tracking-wider uppercase rounded border border-sage/30"
                      >
                        {m}
                      </span>
                    ))}
                    {r.accepted_materials.length > 4 && (
                      <span className="px-2 py-0.5 text-muted text-[10px] font-bold tracking-wider uppercase">
                        +{r.accepted_materials.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 text-[11px] text-muted mb-4 pb-4 border-b border-border">
                  {r.capacity_per_month != null && (
                    <span className="flex items-center gap-1">
                      <Factory className="w-3 h-3" strokeWidth={2} />
                      <span className="font-bold text-ink tabular-nums">{r.capacity_per_month.toLocaleString('id-ID')}</span> kg/bulan
                    </span>
                  )}
                  {r.service_radius_km != null && (
                    <span className="flex items-center gap-1">
                      <Maximize className="w-3 h-3" strokeWidth={2} />
                      <span className="font-bold text-ink tabular-nums">{r.service_radius_km}</span> km radius
                    </span>
                  )}
                  {r.certifications && r.certifications.length > 0 && (
                    <span className="flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3" strokeWidth={2} />
                      <span className="font-bold text-ink tabular-nums">{r.certifications.length}</span> sertifikasi
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/company/marketplace/recyclers/${r.recycler_id}`}
                    className="flex-1 py-2.5 border border-border hover:border-sage hover:text-sage-dark text-ink text-xs font-semibold rounded-full transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    Lihat Profil
                    <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedRecycler(r)
                      setModalOpen(true)
                    }}
                    disabled={listings.filter((l) => l.status === 'open').length === 0}
                    className="group flex-1 bg-sage hover:bg-sage-dark text-white py-2.5 rounded-full text-xs font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
                    {listings.filter((l) => l.status === 'open').length === 0
                      ? 'Tidak ada listing'
                      : 'Kirim Request'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div className="bg-surface border border-border rounded-[18px] p-10 sm:p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-canvas flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-muted" strokeWidth={1.8} />
            </div>
            <p className="text-sm font-bold text-ink tracking-tight">Tidak ada recycler ditemukan</p>

            {filter ? (
              <>
                <p className="text-xs text-muted mt-1.5 max-w-sm mx-auto mb-6">
                  Tidak ada recycler yang cocok dengan kata kunci kamu saat ini. Coba kata kunci lain atau lihat semua material.
                </p>
                <button
                  onClick={() => setFilter('')}
                  className="group inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                  Reset pencarian
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted mt-1.5 max-w-sm mx-auto mb-6">
                  Kami belum menemukan recycler dalam jangkauan layanan perusahaan Anda.
                </p>
                <div className="max-w-sm mx-auto bg-canvas border border-border rounded-2xl p-5 text-left mb-6">
                  <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-3">Langkah selanjutnya</p>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5 text-xs text-ink">
                      <span className="w-5 h-5 rounded-full bg-mint text-sage-dark flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                      <span>
                        Pastikan <strong>alamat perusahaan</strong> sudah diisi dengan benar di profil
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-ink">
                      <span className="w-5 h-5 rounded-full bg-mint text-sage-dark flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                      <span>
                        Pastikan profil <strong>aktif dan terverifikasi</strong> agar tampil di daftar
                      </span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/company/profile"
                  className="group inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
                >
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                  Perbarui Profil Perusahaan
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Request terkirim section */}
      {requests.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2 className="text-sm font-extrabold text-ink tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-[10px] font-extrabold">
                {requests.length}
              </span>
              Request Terkirim
            </h2>
          </div>

          <div className="bg-surface border border-border rounded-[18px] overflow-hidden shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <div className="divide-y divide-border">
              {requests.slice(0, 10).map((r) => {
                const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending
                return (
                  <div key={r.id} className="px-5 py-4 flex items-center gap-3 hover:bg-canvas/40 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-mint/40 text-sage-dark flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink tracking-tight truncate">
                        {r.waste_listings?.material_type || '—'}{' '}
                        <span className="text-muted font-normal tabular-nums">
                          ({r.waste_listings?.weight} {r.waste_listings?.unit})
                        </span>
                      </p>
                      <p className="text-xs text-muted truncate mt-0.5">
                        ke {r.recyclers?.name || '—'} · {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase flex-shrink-0 ${status.classes}`}>
                      {status.icon}
                      {status.label}
                    </span>
                    <Link
                      href={`/company/marketplace/${r.listing_id}`}
                      className="group inline-flex items-center gap-1 text-xs font-semibold text-sage-dark hover:text-sage flex-shrink-0"
                    >
                      Detail
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <RequestPickupModal
        isOpen={modalOpen}
        onClose={() => {
          setSelectedRecycler(null)
          setModalOpen(false)
        }}
        recycler={selectedRecycler}
        listings={listings}
        onSuccess={async () => {
          const requestsRes = await getCompanyRequests()
          setRequests((requestsRes.data as CompanyRequest[]) || [])
          setSuccessMsg('Request Pickup berhasil dikirim!')
          setTimeout(() => setSuccessMsg(null), 4000)
        }}
      />
    </div>
  )
}