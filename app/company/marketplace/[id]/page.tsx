"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  getListingDetail,
  getListingFulfillment,
  acceptBid,
  rejectBid,
} from "@/lib/supabase/actions/marketplace"
import PhotoCarousel from "@/components/marketplace/PhotoCarousel"
import FulfillmentPanel, {
  type FulfillmentData,
} from "@/components/marketplace/FulfillmentPanel"
import { Skeleton } from "@/components/ui/skeletons"
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Inbox,
  Info,
  MessageSquare,
  Package,
  User,
  X,
} from "lucide-react"

type ListingStatus = "open" | "dealing" | "confirmed" | "completed" | "cancelled"

type Bid = {
  id: string
  listing_id: string
  recycler_id: string
  price: number | null
  initiator: string
  status: string
  note: string | null
  created_at: string
  updated_at: string
  pickup_scheduled_at: string | null
  pickup_address: string | null
  pickup_note: string | null
  recyclers: {
    id: string
    name: string
    verification_status: string
  } | null
}

type ListingDetail = {
  id: string
  material_type: string
  category: string
  weight: number
  unit: string
  address_text: string
  pickup_instructions: string | null
  is_sorted: boolean
  is_cleaned: boolean
  is_mixed: boolean
  contaminant_note: string | null
  photos: string[]
  free_for_pickup: boolean
  status: ListingStatus
  created_at: string
}

const STATUS_CONFIG: Record<ListingStatus, {
  label: string
  classes: string
  heroBg: string
  icon: React.ReactNode
}> = {
  open: {
    label: 'Tersedia',
    classes: 'text-sage-dark bg-mint border-sage/30',
    heroBg: 'from-mint to-sage/20',
    icon: (
      <Check className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
  dealing: {
    label: 'Negosiasi',
    classes: 'text-amber-800 bg-amber-50 border-amber-200',
    heroBg: 'from-amber-50 to-amber-100/50',
    icon: (
      <Clock className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
  confirmed: {
    label: 'Dikonfirmasi',
    classes: 'text-sky-800 bg-sky-50 border-sky-200',
    heroBg: 'from-sky-50 to-sky-100/50',
    icon: (
      <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
  completed: {
    label: 'Selesai',
    classes: 'text-muted bg-canvas border-border',
    heroBg: 'from-canvas to-border/30',
    icon: (
      <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
  cancelled: {
    label: 'Dibatalkan',
    classes: 'text-red-700 bg-red-50 border-red-200',
    heroBg: 'from-red-50 to-red-100/50',
    icon: (
      <X className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
}

function BidCard({
  bid,
  listingId,
  listingStatus,
  onAccept,
  onReject,
  processing,
}: {
  bid: Bid
  listingId: string
  listingStatus: ListingStatus
  onAccept: (bidId: string) => void
  onReject: (bidId: string) => void
  processing: boolean
}) {
  const statusColors: Record<string, string> = {
    pending: 'text-amber-800 bg-amber-50 border-amber-200',
    accepted: 'text-sage-dark bg-mint border-sage/30',
    rejected: 'text-red-700 bg-red-50 border-red-200',
    cancelled: 'text-muted bg-canvas border-border',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Menunggu',
    accepted: 'Diterima',
    rejected: 'Ditolak',
    cancelled: 'Dibatalkan',
  }

  const isOwnRequest = bid.initiator === 'company'
  const canAct = !isOwnRequest && bid.status === 'pending' && listingStatus === 'open'
  const canChat = bid.status === 'accepted'

  // Initial letter untuk avatar
  const initial = (bid.recyclers?.name || 'R').charAt(0).toUpperCase()

  return (
    <div className={`bg-surface border rounded-[18px] p-5 transition-all ${
      canChat ? 'border-sage/40 ring-2 ring-sage/10' : 'border-border'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 flex items-start gap-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-sm ${
            bid.recyclers?.verification_status === 'verified'
              ? 'bg-sage text-white'
              : 'bg-canvas border-2 border-border text-ink'
          }`}>
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {bid.recyclers?.id ? (
                <Link
                  href={`/company/marketplace/recyclers/${bid.recyclers.id}`}
                  className="text-sm font-extrabold text-ink tracking-tight hover:text-sage-dark transition-colors truncate"
                >
                  {bid.recyclers?.name || 'Recycler'}
                </Link>
              ) : (
                <p className="text-sm font-extrabold text-ink tracking-tight truncate">
                  {bid.recyclers?.name || 'Recycler'}
                </p>
              )}

              {isOwnRequest && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-bold tracking-wider uppercase rounded border border-sky-200">
                  <User className="w-2.5 h-2.5" strokeWidth={3} />
                  Anda
                </span>
              )}

              {bid.recyclers?.verification_status === 'verified' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-mint text-sage-dark text-[10px] font-bold tracking-wider uppercase rounded border border-sage/30">
                  <BadgeCheck className="w-2.5 h-2.5" strokeWidth={2.5} />
                  Verified
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted mt-1 tabular-nums">
              {new Date(bid.created_at).toLocaleString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>

            {bid.note && (
              <div className="mt-2.5 p-3 bg-canvas rounded-xl border border-border">
                <p className="text-xs text-ink leading-relaxed italic">{bid.note}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-full border ${statusColors[bid.status]}`}>
            {statusLabels[bid.status]}
          </span>
          {bid.price !== null && (
            <div className="text-right">
              <p className="text-sm font-extrabold text-ink tracking-tight tabular-nums">
                Rp {bid.price.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-muted">per kg</p>
            </div>
          )}
        </div>
      </div>

      {canAct && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <button
            onClick={() => onAccept(bid.id)}
            disabled={processing}
            className="group flex-1 bg-sage hover:bg-sage-dark text-white py-2.5 rounded-full text-xs font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
            Terima
          </button>
          <button
            onClick={() => onReject(bid.id)}
            disabled={processing}
            className="group flex-1 border-2 border-border hover:border-red-300 hover:bg-red-50 text-ink hover:text-red-700 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            Tolak
          </button>
        </div>
      )}

      {canChat && (
        <div className="mt-4 pt-4 border-t border-sage/20">
          <Link
            href={`/company/marketplace/${listingId}/chat`}
            className="group w-full py-2.5 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)] flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" strokeWidth={2} />
            Chat dengan {bid.recyclers?.name || 'Recycler'}
          </Link>
        </div>
      )}
    </div>
  )
}

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [initialFulfillment, setInitialFulfillment] = useState<FulfillmentData | null>(null)
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [result, fulfillment] = await Promise.all([
        getListingDetail(id),
        getListingFulfillment(id),
      ])
      if (result.error) {
        setError(result.error as string)
      } else if (result.data) {
        setListing(result.data.listing as ListingDetail)
        setBids((result.data.bids || []) as Bid[])
      }
      if (fulfillment.data) {
        setInitialFulfillment(fulfillment.data as FulfillmentData)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const reload = async () => {
    const result = await getListingDetail(id)
    if (result.data) {
      setListing(result.data.listing as ListingDetail)
      setBids((result.data.bids || []) as Bid[])
    }
  }

  const handleAcceptBid = async (bidId: string) => {
    setProcessing(true)
    setActionMessage(null)
    const formData = new FormData()
    formData.append('bid_id', bidId)
    const result = await acceptBid(formData)
    setProcessing(false)

    if (result.error) {
      setActionMessage({ type: 'error', text: result.error as string })
      toast.error(result.error as string)
    } else {
      setActionMessage({
        type: 'success',
        text: 'Bid diterima! Status listing berubah ke Negosiasi.',
      })
      toast.success('Bid diterima! Status listing berubah ke Negosiasi.')
      await reload()
      setRefreshKey((k) => k + 1)
    }
  }

  const handleRejectBid = async (bidId: string) => {
    setProcessing(true)
    setActionMessage(null)
    const formData = new FormData()
    formData.append('bid_id', bidId)
    const result = await rejectBid(formData)
    setProcessing(false)

    if (result.error) {
      setActionMessage({ type: 'error', text: result.error as string })
      toast.error(result.error as string)
    } else {
      setActionMessage({ type: 'success', text: 'Bid ditolak.' })
      toast.success('Bid ditolak.')
      await reload()
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="bg-surface border border-border rounded-[22px] p-6 sm:p-8 mb-6">
          <Skeleton className="h-3.5 w-28 mb-2" />
          <Skeleton className="h-9 w-2/3 max-w-md" />
          <Skeleton className="h-4 w-48 mt-3" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-80 lg:h-[28rem] w-full rounded-[18px]" />
            <div className="bg-surface border border-border rounded-[18px] p-6 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface border border-border rounded-[18px] p-6 space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-700" strokeWidth={1.8} />
        </div>
        <p className="text-sm font-bold text-ink mb-1">Listing tidak ditemukan</p>
        <p className="text-xs text-muted mb-6">{error || 'Listing mungkin telah dihapus'}</p>
        <Link
          href="/company/marketplace"
          className="group inline-flex items-center gap-1.5 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          Kembali ke Marketplace
        </Link>
      </div>
    )
  }

  const statusInfo = STATUS_CONFIG[listing.status]
  const pendingBids = bids.filter((b) => b.status === 'pending')
  const acceptedBid = bids.find((b) => b.status === 'accepted')

  return (
    <div>
      {/* Top navigation */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <Link
          href="/company/marketplace"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-sage-dark transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
          Kembali ke Marketplace
        </Link>
        <nav className="flex items-center gap-2 text-xs text-muted">
          <Link href="/company/marketplace" className="hover:text-sage-dark transition-colors">
            Marketplace
          </Link>
          <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
          <span className="text-ink font-semibold truncate max-w-[240px]">{listing.material_type}</span>
        </nav>
      </div>

      {/* Hero header */}
      <div className={`bg-gradient-to-br ${statusInfo.heroBg} border border-border rounded-[22px] p-6 sm:p-8 mb-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark mb-2">
              Detail Listing
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink tracking-tight leading-tight break-words">
              {listing.material_type}
            </h1>
            <p className="text-sm text-muted mt-2">{listing.category} · {listing.weight} {listing.unit}</p>
          </div>
          <span className={`inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full border ${statusInfo.classes}`}>
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Action message */}
      {actionMessage && (
        <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 ${
          actionMessage.type === 'success'
            ? 'bg-mint border border-sage/30'
            : 'bg-red-50 border border-red-200'
        }`}>
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
          )}
          <p className={`text-sm font-medium ${
            actionMessage.type === 'success' ? 'text-sage-dark' : 'text-red-700'
          }`}>
            {actionMessage.text}
          </p>
        </div>
      )}

      {/* Accepted bid banner */}
      {acceptedBid && listing.status === 'dealing' && (
        <div className="mb-6 bg-gradient-to-r from-sky-50 to-mint border border-sage/30 rounded-[18px] p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-sage text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]">
              <CheckCircle2 className="w-5 h-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink tracking-tight truncate">
                Bid diterima oleh {acceptedBid.recyclers?.name}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Diskusikan detail pickup via chat untuk mempercepat proses
              </p>
            </div>
          </div>
          <Link
            href={`/company/marketplace/${listing.id}/chat`}
            className="group inline-flex items-center gap-2 px-4 py-2.5 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)] flex-shrink-0"
          >
            <MessageSquare className="w-4 h-4" strokeWidth={2} />
            Buka Chat
          </Link>
        </div>
      )}

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Photo carousel */}
          <PhotoCarousel
            photos={listing.photos || []}
            materialType={listing.material_type}
            category={listing.category}
            height="h-80 lg:h-[28rem]"
          />

          {/* Material info */}
          <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-8 h-8 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center">
                <Info className="w-4 h-4" strokeWidth={2} />
              </span>
              <h3 className="text-sm font-extrabold text-ink tracking-tight">Informasi Material</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-canvas border border-border rounded-xl p-3">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Jenis</p>
                <p className="text-sm font-bold text-ink tracking-tight">{listing.material_type}</p>
              </div>
              <div className="bg-canvas border border-border rounded-xl p-3">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Kategori</p>
                <p className="text-sm font-bold text-ink tracking-tight">{listing.category}</p>
              </div>
              <div className="bg-canvas border border-border rounded-xl p-3">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Berat</p>
                <p className="text-sm font-bold text-ink tracking-tight tabular-nums">{listing.weight} {listing.unit}</p>
              </div>
              <div className="bg-canvas border border-border rounded-xl p-3">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Harga</p>
                <p className="text-sm font-bold tracking-tight">
                  {listing.free_for_pickup ? (
                    <span className="text-sage-dark">Gratis Pickup</span>
                  ) : (
                    <span className="text-ink">Berbayar</span>
                  )}
                </p>
              </div>
            </div>

            {/* Condition */}
            <div className="pt-5 border-t border-border">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-3">Kondisi Material</p>
              <div className="flex flex-wrap gap-2">
                {listing.is_sorted && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-mint text-sage-dark text-xs font-bold rounded-lg border border-sage/30">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Sudah dipilah
                  </span>
                )}
                {listing.is_cleaned && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-mint text-sage-dark text-xs font-bold rounded-lg border border-sage/30">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Sudah dicuci
                  </span>
                )}
                {listing.is_mixed && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Tercampur
                  </span>
                )}
                {!listing.is_sorted && !listing.is_cleaned && !listing.is_mixed && (
                  <span className="text-xs text-muted italic">Tidak ada kriteria yang ditandai</span>
                )}
              </div>
              {listing.is_mixed && listing.contaminant_note && (
                <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-800 leading-relaxed">{listing.contaminant_note}</p>
                </div>
              )}
            </div>

            {/* Address & instructions */}
            <div className="pt-5 border-t border-border mt-5 space-y-3">
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1.5">Alamat</p>
                <p className="text-sm text-ink leading-relaxed">{listing.address_text}</p>
              </div>
              {listing.pickup_instructions && (
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1.5">Instruksi Pickup</p>
                  <p className="text-sm text-ink leading-relaxed">{listing.pickup_instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Bids */}
          <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center">
                  <Inbox className="w-4 h-4" strokeWidth={2} />
                </span>
                <h3 className="text-sm font-extrabold text-ink tracking-tight">
                  Penawaran Masuk
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-canvas text-[10px] font-extrabold text-ink">
                    {bids.length}
                  </span>
                </h3>
              </div>
              {pendingBids.length > 0 && listing.status === 'open' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                  <Clock className="w-2.5 h-2.5" strokeWidth={3} />
                  {pendingBids.length} Menunggu
                </span>
              )}
            </div>

            {bids.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-canvas flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6 text-muted" strokeWidth={1.8} />
                </div>
                <p className="text-sm font-bold text-ink">Belum ada penawaran</p>
                <p className="text-xs text-muted mt-1">Recycler akan mengirim bid jika tertarik dengan listing Anda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bids.map((bid) => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    listingId={listing.id}
                    listingStatus={listing.status}
                    onAccept={handleAcceptBid}
                    onReject={handleRejectBid}
                    processing={processing}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
          {/* Jadwal pickup */}
          {acceptedBid?.pickup_scheduled_at && (
            <div className="bg-surface border border-sage/30 rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(85,158,123,0.12)]">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-lg bg-sage text-white flex items-center justify-center shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]">
                  <CalendarDays className="w-4 h-4" strokeWidth={2} />
                </span>
                <h3 className="text-sm font-extrabold text-ink tracking-tight">Jadwal Pickup</h3>
              </div>

              <dl className="space-y-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Waktu</dt>
                  <dd className="text-ink font-bold text-right tabular-nums">
                    {new Date(acceptedBid.pickup_scheduled_at).toLocaleString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </dd>
                </div>
                {acceptedBid.pickup_address && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Alamat</dt>
                    <dd className="text-ink text-right leading-relaxed">{acceptedBid.pickup_address}</dd>
                  </div>
                )}
                {acceptedBid.pickup_note && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Catatan</dt>
                    <dd className="text-ink text-right leading-relaxed">{acceptedBid.pickup_note}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Fulfillment panel */}
          <FulfillmentPanel
            listingId={listing.id}
            role="company"
            onChanged={reload}
            refreshKey={refreshKey}
            initialData={initialFulfillment}
          />

          {/* Metadata card */}
          <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-canvas text-muted flex items-center justify-center">
                <BarChart3 className="w-4 h-4" strokeWidth={2} />
              </span>
              <h3 className="text-sm font-extrabold text-ink tracking-tight">Statistik</h3>
            </div>

            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Dibuat</dt>
                <dd className="text-ink font-bold">
                  {new Date(listing.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Total Bid</dt>
                <dd className="text-ink font-extrabold tabular-nums">{bids.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Bid Pending</dt>
                <dd className="text-ink font-extrabold tabular-nums">{pendingBids.length}</dd>
              </div>
              {acceptedBid && (
                <div className="flex justify-between gap-3 pt-2.5 border-t border-border">
                  <dt className="text-muted">Bid Diterima</dt>
                  <dd className="text-sage-dark font-extrabold truncate">
                    {acceptedBid.recyclers?.name || '1'}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Disclaimer */}
          <div className="bg-canvas border border-border rounded-[18px] p-4">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-[11px] text-muted leading-relaxed">
                Pastikan detail listing akurat sebelum menerima bid. Transaksi yang sudah dikonfirmasi akan masuk ke proses fulfillment.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}