"use client"

import { useState, useEffect } from "react"
import {
  getRecyclerListings,
} from "@/lib/supabase/actions/marketplace"
import Link from "next/link"
import ListingThumbnail from "@/components/marketplace/ListingThumbnail"
import { Skeleton } from "@/components/ui/skeletons"
import Pagination from "@/components/ui/Pagination"
import usePagination from "@/lib/hooks/usePagination"
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  MapPin,
  MessageCircle,
  Recycle,
  Scale,
  Search,
  Wrench,
  X,
} from "lucide-react"

type WasteListing = {
  id: string
  company_id: string
  company_name: string
  material_type: string
  category: string
  weight: number
  unit: string
  address_text: string
  photos: string[]
  pickup_schedule: string
  free_for_pickup: boolean
  status: "open" | "dealing" | "confirmed" | "completed" | "cancelled"
  distance_km: number
  my_bid_status: string | null
}

type FilterInfo = {
  lat: number
  lng: number
  radius_km: number
  is_active: boolean
}

type ListingStatus = "open" | "dealing" | "confirmed" | "completed" | "cancelled"

const LISTING_STATUS_CONFIG: Record<ListingStatus, {
  label: string
  classes: string
  icon: React.ReactNode
}> = {
  open: {
    label: "Tersedia",
    classes: "text-sage-dark bg-mint border-sage/30",
    icon: (
      <Check className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  dealing: {
    label: "Negosiasi",
    classes: "text-amber-800 bg-amber-50 border-amber-200",
    icon: (
      <Clock className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  confirmed: {
    label: "Dikonfirmasi",
    classes: "text-sky-800 bg-sky-50 border-sky-200",
    icon: (
      <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  completed: {
    label: "Selesai",
    classes: "text-muted bg-canvas border-border",
    icon: (
      <Check className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
  cancelled: {
    label: "Dibatalkan",
    classes: "text-red-700 bg-red-50 border-red-200",
    icon: (
      <X className="w-2.5 h-2.5" strokeWidth={3} />
    ),
  },
}

const STATUS_FILTER_OPTIONS: { value: ListingStatus | ""; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "open", label: "Tersedia" },
  { value: "dealing", label: "Negosiasi" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
]

function ProfileSetupCTA() {
  return (
    <div className="bg-surface border border-amber-200 rounded-[22px] p-10 text-center shadow-[0_12px_24px_-16px_rgba(11,31,22,0.08)]">
      <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5">
        <MapPin className="w-9 h-9 text-amber-700" strokeWidth={1.8} />
      </div>
      <h2 className="text-base font-extrabold text-ink tracking-tight mb-2">
        Profil Fasilitas Belum Lengkap
      </h2>
      <p className="text-xs text-muted mb-6 max-w-md mx-auto leading-relaxed">
        Untuk melihat listing limbah di sekitar Anda, lengkapi dulu lokasi fasilitas dan radius layanan di halaman profil.
      </p>
      <Link
        href="/recycler/profile"
        className="group inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
      >
        <Wrench className="w-4 h-4" strokeWidth={2} />
        Lengkapi Profil Fasilitas
      </Link>
    </div>
  )
}

function MaterialSetupCTA() {
  return (
    <div className="bg-surface border border-amber-200 rounded-[22px] p-10 text-center shadow-[0_12px_24px_-16px_rgba(11,31,22,0.08)]">
      <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5">
        <Recycle className="w-9 h-9 text-amber-700" strokeWidth={1.8} />
      </div>
      <h2 className="text-base font-extrabold text-ink tracking-tight mb-2">
        Pilih Jenis Material Diterima
      </h2>
      <p className="text-xs text-muted mb-6 max-w-md mx-auto leading-relaxed">
        Untuk melihat listing limbah yang relevan, pilih minimal 1 jenis material yang diterima fasilitas Anda di halaman profil.
      </p>
      <Link
        href="/recycler/profile"
        className="group inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
      >
        <Recycle className="w-4 h-4" strokeWidth={2} />
        Pilih Material Diterima
      </Link>
    </div>
  )
}

function ListingCard({ listing }: { listing: WasteListing }) {
  const hasActiveBid = listing.my_bid_status === 'accepted'
  const hasPendingBid = listing.my_bid_status === 'pending'
  const statusInfo = LISTING_STATUS_CONFIG[listing.status as ListingStatus] ?? LISTING_STATUS_CONFIG.open

  return (
    <div className={`group bg-surface border rounded-[18px] overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-16px_rgba(11,31,22,0.12)] ${
      hasActiveBid
        ? 'border-sage/40 ring-2 ring-sage/20'
        : 'border-border hover:border-sage/40'
    }`}>
      {/* Active bid banner */}
      {hasActiveBid && (
        <div className="bg-gradient-to-r from-sage to-sage-dark text-white text-center py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase flex items-center justify-center gap-1.5">
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          Bid Anda Diterima
        </div>
      )}
      {hasPendingBid && (
        <div className="bg-amber-500 text-white text-center py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase flex items-center justify-center gap-1.5">
          <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
          Bid Menunggu
        </div>
      )}

      {/* Thumbnail */}
      <Link href={`/recycler/marketplace/${listing.id}`} className="block">
        <ListingThumbnail
          photos={listing.photos || []}
          materialType={listing.material_type}
          category={listing.category}
          className="h-44"
        />
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-extrabold text-ink tracking-tight truncate">
              {listing.material_type}
            </h3>
            <p className="text-[11px] text-muted mt-0.5 font-medium">{listing.category}</p>
            <Link
              href={`/recycler/marketplace/companies/${listing.company_id}`}
              className="text-[11px] text-sage-dark hover:text-sage mt-1 block truncate font-semibold transition-colors"
            >
              {listing.company_name}
            </Link>
          </div>
          <div className="flex flex-col items-end flex-shrink-0 gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold tracking-wider uppercase ${statusInfo.classes}`}>
              {statusInfo.icon}
              {statusInfo.label}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-full text-[10px] font-bold tabular-nums">
              <MapPin className="w-2.5 h-2.5" strokeWidth={2.5} />
              {listing.distance_km.toFixed(1)} km
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-4 text-[11px] text-muted">
            <div className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="font-bold text-ink tabular-nums">{listing.weight} {listing.unit || 'kg'}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
              <span className="truncate">{listing.address_text}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
            <div>
              {listing.free_for_pickup ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sage-dark">
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Gratis Pickup
                </span>
              ) : (
                <span className="text-[11px] font-medium text-muted">Berbayar</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasActiveBid && listing.status !== 'completed' && (
                <Link
                  href={`/recycler/marketplace/${listing.id}/chat`}
                  className="group inline-flex items-center gap-1 px-3 py-1.5 bg-sage hover:bg-sage-dark text-white text-[11px] font-bold rounded-full transition-all hover:-translate-y-0.5"
                >
                  <MessageCircle className="w-3 h-3" strokeWidth={2} />
                  Chat
                </Link>
              )}
              {hasPendingBid && (
                <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold rounded-full">
                  Menunggu...
                </span>
              )}
              <Link
                href={`/recycler/marketplace/${listing.id}`}
                className="group inline-flex items-center gap-1 text-[11px] font-semibold text-sage-dark hover:text-sage"
              >
                Detail
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ListingsFeed({
  listings,
  filterInfo,
}: {
  listings: WasteListing[]
  filterInfo: FilterInfo
}) {
  const [materialFilter, setMaterialFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "">("")
  const [freeOnly, setFreeOnly] = useState(false)

  const filteredListings = listings.filter((listing) => {
    if (!materialFilter && !statusFilter && !freeOnly) return true
    if (materialFilter) {
      const q = materialFilter.toLowerCase()
      const matches =
        listing.category.toLowerCase().includes(q) ||
        listing.material_type.toLowerCase().includes(q)
      if (!matches) return false
    }
    if (statusFilter && listing.status !== statusFilter) return false
    if (freeOnly && !listing.free_for_pickup) return false
    return true
  })

  const pag = usePagination(filteredListings)

  return (
    <div>
      {/* Filter bar */}
      <div className="bg-surface border border-border rounded-[18px] p-5 mb-6 sticky top-0 z-10 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.08)] backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Cari Material
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
              <input
                type="text"
                placeholder="Contoh: PET, Kardus, Aluminium..."
                value={materialFilter}
                onChange={(e) => {
                  setMaterialFilter(e.target.value)
                  pag.goToPage(1)
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-border rounded-full text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              />
            </div>
          </div>

          {/* Radius badge */}
          <div className="flex items-end">
            <div className="bg-gradient-to-br from-mint to-sage/10 border border-sage/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-sage text-white flex items-center justify-center shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)] flex-shrink-0">
                <MapPin className="w-4 h-4" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[10px] text-sage-dark font-bold tracking-wider uppercase">
                  Radius Filter
                </p>
                <p className="text-sm font-extrabold text-ink tracking-tight tabular-nums">
                  {filterInfo.radius_km} km
                </p>
              </div>
              <span className="h-8 w-px bg-sage/20 hidden sm:block" />
              <Link
                href="/recycler/profile"
                className="hidden sm:inline-flex items-center gap-1 text-[11px] text-sage-dark hover:text-sage font-bold transition-colors"
              >
                Ubah
                <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex flex-col md:flex-row md:items-center gap-3">
          {/* Status filter */}
          <div className="w-36">
            <label className="sr-only">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ListingStatus | "")
                pag.goToPage(1)
              }}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none flex-shrink-0">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => {
                setFreeOnly(e.target.checked)
                pag.goToPage(1)
              }}
              className="w-4 h-4 text-sage border-border rounded focus:ring-sage"
            />
            <span className="text-xs font-semibold text-ink whitespace-nowrap">Gratis saja</span>
          </label>

          <div className="md:ml-auto flex items-center gap-3 flex-shrink-0">
            <p className="text-[11px] text-muted flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-sage/20 text-sage-dark flex items-center justify-center text-[10px] font-extrabold">
                {filteredListings.length}
              </span>
              dari {listings.length} listing
            </p>
            <Link
              href="/recycler/requests"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-full text-[11px] font-bold text-ink hover:text-sage-dark hover:border-sage transition-colors whitespace-nowrap"
            >
              <Inbox className="w-3.5 h-3.5" strokeWidth={2} />
              Lihat Request Company
            </Link>
          </div>
        </div>
      </div>

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
            <Search className="w-7 h-7 text-muted" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-bold text-ink tracking-tight">Tidak ada listing yang cocok</p>
          <p className="text-xs text-muted mt-1.5 max-w-sm mx-auto">
            Coba ubah filter material, status, atau perlebar radius di profil Anda
          </p>
        </div>
      )}
    </div>
  )
}

// Main page
export default function RecyclerMarketplacePage() {
  const [listings, setListings] = useState<WasteListing[]>([])
  const [filterInfo, setFilterInfo] = useState<FilterInfo | null>(null)
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false)
  const [needsAcceptedMaterials, setNeedsAcceptedMaterials] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadListings() {
      setLoading(true)
      setError(null)

      const result = await getRecyclerListings()

      if (result.needsProfileSetup) {
        setNeedsProfileSetup(true)
        setLoading(false)
        return
      }

      if (result.needsAcceptedMaterials) {
        setNeedsAcceptedMaterials(true)
        setLoading(false)
        return
      }

      if (result.error) setError(result.error as string)

      setListings((result.data || []) as WasteListing[])
      if (result.filterInfo) setFilterInfo(result.filterInfo as FilterInfo)
      setLoading(false)
    }
    loadListings()
  }, [])

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        {loading ? (
          <div className="animate-fade-in">
            <Skeleton className="h-9 sm:h-10 w-2/3 max-w-sm" />
            <Skeleton className="h-4 w-full max-w-xl mt-3" />
          </div>
        ) : (
          <>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
              Pasar <span className="text-sage">Limbah.</span>
            </h1>
            <p className="mt-3 text-sm text-muted max-w-2xl">
              Temukan material limbah sesuai kapasitas & lokasi fasilitas Anda. Bid listing untuk memulai transaksi.
            </p>
          </>
        )}
      </div>

      {loading ? (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <Skeleton className="h-10 w-52 rounded-full" />
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-red-900">Error</p>
            <p className="text-xs text-red-800 mt-0.5">{error}</p>
          </div>
        </div>
      ) : needsProfileSetup ? (
        <ProfileSetupCTA />
      ) : needsAcceptedMaterials ? (
        <MaterialSetupCTA />
      ) : (
        <>
          {filterInfo && (
            <ListingsFeed
              listings={listings}
              filterInfo={filterInfo}
            />
          )}

          {!filterInfo && !loading && (
            <p className="text-sm text-muted text-center py-12">Tidak ada data</p>
          )}
        </>
      )}
    </div>
  )
}