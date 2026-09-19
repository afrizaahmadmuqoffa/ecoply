"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  getListingDetailForRecycler,
  getListingFulfillment,
  createMarketplaceBid,
  respondToCompanyRequest,
} from "@/lib/supabase/actions/marketplace"
import PhotoCarousel from "@/components/marketplace/PhotoCarousel"
import FulfillmentPanel, {
  type FulfillmentData,
} from "@/components/marketplace/FulfillmentPanel"
import { Skeleton } from "@/components/ui/skeletons"
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  X,
} from "lucide-react"

type ListingStatus = "open" | "dealing" | "confirmed" | "completed" | "cancelled"

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
  companies: {
    id: string
    name: string
    logo_url: string | null
  } | null
}

type Bid = {
  id: string
  price: number | null
  status: string
  note: string | null
  created_at: string
  initiator: string
  pickup_scheduled_at: string | null
  pickup_address: string | null
  pickup_note: string | null
}

const STATUS_CONFIG: Record<ListingStatus, {
  label: string
  classes: string
  heroBg: string
  icon: React.ReactNode
}> = {
  open: {
    label: "Tersedia",
    classes: "text-sage-dark bg-mint border-sage/30",
    heroBg: "from-mint to-sage/20",
    icon: (
      <Check className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
  dealing: {
    label: "Negosiasi",
    classes: "text-amber-800 bg-amber-50 border-amber-200",
    heroBg: "from-amber-50 to-amber-100/50",
    icon: (
      <Clock className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
  confirmed: {
    label: "Dikonfirmasi",
    classes: "text-sky-800 bg-sky-50 border-sky-200",
    heroBg: "from-sky-50 to-sky-100/50",
    icon: (
      <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
  completed: {
    label: "Selesai",
    classes: "text-muted bg-canvas border-border",
    heroBg: "from-canvas to-border/30",
    icon: (
      <Check className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
  cancelled: {
    label: "Dibatalkan",
    classes: "text-red-700 bg-red-50 border-red-200",
    heroBg: "from-red-50 to-red-100/50",
    icon: (
      <X className="w-4 h-4" strokeWidth={2.5} />
    ),
  },
}

const BID_STATUS_CONFIG: Record<string, {
  label: string
  classes: string
  icon: React.ReactNode
}> = {
  pending: {
    label: "Menunggu Respons",
    classes: "text-amber-800 bg-amber-50 border-amber-200",
    icon: (
      <Clock className="w-3 h-3" strokeWidth={2.5} />
    ),
  },
  accepted: {
    label: "Diterima",
    classes: "text-sage-dark bg-mint border-sage/30",
    icon: (
      <Check className="w-3 h-3" strokeWidth={2.5} />
    ),
  },
  rejected: {
    label: "Ditolak",
    classes: "text-red-700 bg-red-50 border-red-200",
    icon: (
      <X className="w-3 h-3" strokeWidth={2.5} />
    ),
  },
  cancelled: {
    label: "Dibatalkan",
    classes: "text-muted bg-canvas border-border",
    icon: (
      <X className="w-3 h-3" strokeWidth={2.5} />
    ),
  },
}

export default function RecyclerListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [myBid, setMyBid] = useState<Bid | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialFulfillment, setInitialFulfillment] = useState<FulfillmentData | null>(null)
  const [bidModalOpen, setBidModalOpen] = useState(false)
  const [responding, setResponding] = useState(false)
  const [respondMsg, setRespondMsg] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const refresh = async () => {
    const result = await getListingDetailForRecycler(id)
    if (result.error) {
      setError(result.error as string)
    } else if (result.data) {
      setListing(result.data.listing as ListingDetail)
      setMyBid((result.data.myBid || null) as Bid | null)
    }
  }

  const handleRespond = async (bidId: string, action: "accept" | "reject") => {
    setResponding(true)
    setRespondMsg(null)
    const formData = new FormData()
    formData.append("bid_id", bidId)
    formData.append("action", action)
    const result = await respondToCompanyRequest(formData)
    setResponding(false)
    if (result.error) {
      setRespondMsg({ type: "error", text: result.error as string })
      toast.error(result.error as string)
    } else {
      setRespondMsg({
        type: "success",
        text:
          action === "accept"
            ? "Request diterima! Anda bisa chat dengan company."
            : "Request ditolak.",
      })
      toast.success(
        action === "accept"
          ? "Request diterima! Anda bisa chat dengan company."
          : "Request ditolak.",
      )
      await refresh()
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [, fulfillment] = await Promise.all([
        refresh(),
        getListingFulfillment(id),
      ])
      if (cancelled) return
      if (fulfillment.data) {
        setInitialFulfillment(fulfillment.data as FulfillmentData)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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
          href="/recycler/marketplace"
          className="group inline-flex items-center gap-1.5 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          Kembali ke Marketplace
        </Link>
      </div>
    )
  }

  const statusInfo = STATUS_CONFIG[listing.status]
  const bidInfo = myBid ? BID_STATUS_CONFIG[myBid.status] : null
  const canChat = myBid?.status === "accepted"

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
          <span className="text-ink font-semibold truncate max-w-[240px]">{listing.material_type}</span>
        </nav>
      </div>

      {/* Hero */}
      <div className={`bg-gradient-to-br ${statusInfo.heroBg} border border-border rounded-[22px] p-6 sm:p-8 mb-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-sage-dark mb-2">
              Detail Listing
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink tracking-tight leading-tight break-words">
              {listing.material_type}
            </h1>
            <p className="text-sm text-muted mt-2">
              {listing.category} ·{' '}
              <Link
                href={`/recycler/marketplace/companies/${listing.companies?.id}`}
                className="text-sage-dark hover:text-sage font-semibold transition-colors"
              >
                {listing.companies?.name || 'Company'}
              </Link>
            </p>
          </div>
          <span className={`inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full border ${statusInfo.classes}`}>
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Respond message */}
      {respondMsg && (
        <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 ${
          respondMsg.type === 'success'
            ? 'bg-mint border border-sage/30'
            : 'bg-red-50 border border-red-200'
        }`}>
          {respondMsg.type === 'success' ? (
            <Check className="w-5 h-5 text-sage-dark mt-0.5 flex-shrink-0" strokeWidth={2.5} />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
          )}
          <p className={`text-sm font-medium ${
            respondMsg.type === 'success' ? 'text-sage-dark' : 'text-red-700'
          }`}>
            {respondMsg.text}
          </p>
        </div>
      )}

      {/* Accepted bid banner */}
      {canChat && (
        <div className="mb-6 bg-gradient-to-r from-sky-50 to-mint border border-sage/30 rounded-[18px] p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-sage text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]">
              <Check className="w-5 h-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink tracking-tight truncate">
                Bid Anda Diterima! 🎉
              </p>
              <p className="text-xs text-muted mt-0.5">
                Diskusikan jadwal pickup dengan <b>{listing.companies?.name}</b>
              </p>
            </div>
          </div>
          <Link
            href={`/recycler/marketplace/${listing.id}/chat`}
            className="group inline-flex items-center gap-2 px-4 py-2.5 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)] flex-shrink-0"
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2} />
            Buka Chat
          </Link>
        </div>
      )}

      {/* My bid status card */}
      {myBid && bidInfo && (
        <div className="mb-6 bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1.5">
                {myBid.initiator === "company"
                  ? "Status Request dari Company"
                  : "Status Bid Anda"}
              </p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${bidInfo.classes}`}>
                {bidInfo.icon}
                {bidInfo.label}
              </span>
            </div>
            {myBid.price !== null && (
              <div className="text-right">
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-1">Harga Penawaran</p>
                <p className="text-lg font-extrabold text-ink tracking-tight tabular-nums">
                  Rp {myBid.price.toLocaleString("id-ID")}
                  <span className="text-xs font-normal text-muted ml-1">/{listing.unit}</span>
                </p>
              </div>
            )}
          </div>
          {myBid.note && (
            <div className="p-3 bg-canvas rounded-xl border border-border">
              <p className="text-xs text-ink leading-relaxed italic">
                {myBid.initiator === "company"
                  ? `Catatan dari company: "${myBid.note}"`
                  : `Catatan Anda: "${myBid.note}"`}
              </p>
            </div>
          )}

          {myBid.initiator === "company" && myBid.status === "pending" && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <button
                disabled={responding}
                onClick={() => handleRespond(myBid.id, "accept")}
                className="group flex-1 bg-sage hover:bg-sage-dark text-white py-2.5 rounded-full text-xs font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                {responding ? "Memproses..." : "Terima Request"}
              </button>
              <button
                disabled={responding}
                onClick={() => handleRespond(myBid.id, "reject")}
                className="group flex-1 border-2 border-border hover:border-red-300 hover:bg-red-50 text-ink hover:text-red-700 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                Tolak
              </button>
            </div>
          )}

          {myBid.status === "accepted" && myBid.pickup_scheduled_at && (
            <div className="mt-4 pt-4 border-t border-sage/20">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-3">
                Jadwal Pickup Dikonfirmasi
              </p>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-sky-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <div>
                    <p className="text-sky-900/70 text-[10px] font-bold uppercase">Waktu</p>
                    <p className="text-sky-900 font-bold tabular-nums mt-0.5">
                      {new Date(myBid.pickup_scheduled_at).toLocaleString("id-ID", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                {myBid.pickup_address && (
                  <div className="flex items-start gap-2 pt-2 border-t border-sky-200/50">
                    <MapPin className="w-3.5 h-3.5 text-sky-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <div>
                      <p className="text-sky-900/70 text-[10px] font-bold uppercase">Alamat</p>
                      <p className="text-sky-900 font-bold mt-0.5">{myBid.pickup_address}</p>
                    </div>
                  </div>
                )}
                {myBid.pickup_note && (
                  <div className="pt-2 border-t border-sky-200/50">
                    <p className="text-sky-900/70 text-[10px] font-bold uppercase mb-1">Catatan</p>
                    <p className="text-sky-800">{myBid.pickup_note}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main */}
        <div className="lg:col-span-8 space-y-6">
          <PhotoCarousel
            photos={listing.photos || []}
            materialType={listing.material_type}
            category={listing.category}
            height="h-80 lg:h-[28rem]"
          />

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

            {/* Address */}
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
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
          {/* Company card */}
          <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center">
                <Building2 className="w-4 h-4" strokeWidth={2} />
              </span>
              <h3 className="text-sm font-extrabold text-ink tracking-tight">Pemilik Listing</h3>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/recycler/marketplace/companies/${listing.companies?.id}`}
                className="w-12 h-12 rounded-full bg-sage/20 flex items-center justify-center flex-shrink-0 ring-4 ring-sage/10"
              >
                <span className="text-sage-dark font-extrabold text-lg">
                  {listing.companies?.name?.charAt(0) || "C"}
                </span>
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/recycler/marketplace/companies/${listing.companies?.id}`}
                  className="text-sm font-bold text-ink tracking-tight hover:text-sage-dark transition-colors truncate block"
                >
                  {listing.companies?.name || "Company"}
                </Link>
                <p className="text-[11px] text-muted mt-0.5 tabular-nums">
                  Listing {new Date(listing.created_at).toLocaleDateString("id-ID", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Fulfillment */}
          <FulfillmentPanel
            listingId={listing.id}
            role="recycler"
            onChanged={refresh}
            initialData={initialFulfillment}
          />

          {/* Chat card */}
          {canChat && (
            <div className="bg-gradient-to-br from-sage to-sage-dark rounded-[18px] p-5 text-white shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-5 h-5" strokeWidth={2} />
                  <h3 className="text-sm font-extrabold tracking-tight">Chat Aktif</h3>
                </div>
                <p className="text-xs text-white/80 mb-4">
                  Dengan <b>{listing.companies?.name}</b>
                </p>
                <Link
                  href={`/recycler/marketplace/${listing.id}/chat`}
                  className="group block w-full py-2.5 bg-white text-sage-dark text-xs font-bold rounded-full hover:-translate-y-0.5 transition-all text-center"
                >
                  Buka Chat
                </Link>
              </div>
            </div>
          )}

          {/* Bid CTA */}
          {!myBid && listing.status === "open" && (
            <div className="bg-surface border border-border rounded-[18px] p-5 shadow-[0_8px_16px_-12px_rgba(11,31,22,0.06)]">
              <h3 className="text-sm font-extrabold text-ink tracking-tight mb-1">
                Belum Bid?
              </h3>
              <p className="text-xs text-muted mb-4">
                Kirim penawaran harga untuk listing ini
              </p>
              <button
                onClick={() => {
                  setError(null)
                  setBidModalOpen(true)
                }}
                className="group w-full bg-sage hover:bg-sage-dark text-white py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Kirim Bid
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Bid Modal */}
      {bidModalOpen && listing && (
        <BidModal
          listing={listing}
          onClose={() => setBidModalOpen(false)}
          onSuccess={() => {
            setBidModalOpen(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function BidModal({
  listing,
  onClose,
  onSuccess,
}: {
  listing: ListingDetail
  onClose: () => void
  onSuccess: () => void
}) {
  const [price, setPrice] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)
    setLoading(true)

    const form = new FormData()
    form.append("listing_id", listing.id)
    form.append("price", price)
    form.append("initiator", "recycler")
    if (note) form.append("note", note)

    const result = await createMarketplaceBid(form)
    setLoading(false)

    if (result.error) {
      setModalError(result.error)
      toast.error(result.error)
      return
    }

    toast.success('Bid berhasil dikirim')
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-[22px] max-w-md w-full overflow-hidden shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)]">
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-surface rounded-t-[22px]">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-10 h-10 rounded-lg bg-sage text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]">
              <Banknote className="w-5 h-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block mb-0.5">
                Kirim Penawaran
              </span>
              <h2 className="text-base font-extrabold text-ink tracking-tight">Bid Listing</h2>
              <p className="text-xs text-muted mt-0.5 truncate">
                {listing.material_type} ({listing.weight} {listing.unit})
              </p>
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
          {modalError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-xs text-red-700">{modalError}</p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Harga Penawaran (IDR/{listing.unit || "kg"})
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder={`Masukkan harga per ${listing.unit || "kg"}`}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Catatan Tambahan <span className="text-muted font-normal">(opsional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all resize-none"
              rows={3}
              placeholder="Contoh: Jadwal pickup, persyaratan kualitas, dll."
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
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" strokeWidth={2.5} />
                  Kirim Bid
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}