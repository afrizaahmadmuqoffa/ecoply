'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { getChatThreadByListingId } from '@/lib/supabase/actions/chat'
import { createClient } from '@/lib/supabase/client'
import ChatPanel from '@/components/chat/ChatPanel'
import { Skeleton } from '@/components/ui/skeletons'
import { AlertTriangle, ArrowLeft, ExternalLink, Info } from 'lucide-react'

type ThreadDetail = {
  id: string
  listing_id: string
  waste_listings: {
    id: string
    material_type: string
    category: string
    weight: number
    unit: string
  } | null
  companies: { id: string; name: string } | null
  recyclers: { id: string; name: string } | null
}

export default function CompanyListingChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: listingId } = use(params)
  const [thread, setThread] = useState<ThreadDetail | null>(null)
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      const result = await getChatThreadByListingId(listingId)
      if (result.error) {
        setError(result.error as string)
      } else if (result.data) {
        setThread(result.data as ThreadDetail)
      } else {
        setError('Chat belum tersedia. Terima bid dari recycler terlebih dahulu untuk memulai percakapan.')
      }
      setLoading(false)
    }
    load()
  }, [listingId])

  if (loading) {
    return (
      <div className="h-[100dvh] flex flex-col bg-surface animate-fade-in">
        <div className="border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full flex-shrink-0" />
        </div>
        <div className="flex-1 p-4 sm:p-6 flex flex-col justify-end gap-4 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <Skeleton
                className={`h-12 ${
                  i % 2 === 0 ? 'w-3/5 rounded-3xl rounded-br-md' : 'w-2/5 rounded-3xl rounded-bl-md'
                }`}
              />
            </div>
          ))}
        </div>
        <div className="border-t border-border p-4">
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    )
  }

  if (error || !thread) {
    return (
      <div className="h-[100dvh] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-9 h-9 text-amber-700" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-bold text-ink tracking-tight mb-1">
            {error || 'Chat tidak ditemukan'}
          </p>
          <p className="text-xs text-muted mb-8 leading-relaxed">
            {error?.includes('belum tersedia')
              ? 'Terima salah satu bid dari recycler terlebih dahulu untuk membuka chat.'
              : 'Pastikan listing memiliki bid yang sudah diterima.'}
          </p>
          <Link
            href={`/company/marketplace/${listingId}`}
            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            Kembali ke Detail Listing
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-surface">
      {/* Compact header */}
      <div className="bg-surface border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0 shadow-[0_2px_8px_-4px_rgba(11,31,22,0.06)]">
        <Link
          href={`/company/marketplace/${listingId}`}
          className="w-9 h-9 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors flex-shrink-0"
          title="Kembali"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
        </Link>

        <div className="w-10 h-10 rounded-full bg-sage text-white flex items-center justify-center flex-shrink-0 text-sm font-extrabold shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]">
          {(thread.recyclers?.name || 'R').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-extrabold text-ink tracking-tight truncate">
            {thread.recyclers?.name || 'Recycler'}
          </h1>
          <p className="text-xs text-muted truncate">
            {thread.waste_listings?.material_type} · {thread.waste_listings?.weight} {thread.waste_listings?.unit}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-sage-dark font-bold text-xs flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />
          Live
        </div>

        <Link
          href={`/company/marketplace/${listingId}`}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-canvas hover:bg-surface border border-border text-ink text-xs font-semibold rounded-full transition-all hover:border-sage/40"
        >
          <ExternalLink className="w-3 h-3" strokeWidth={2} />
          Listing
        </Link>
      </div>

      {/* Info banner */}
      <div className="bg-canvas/40 border-b border-border px-4 sm:px-6 py-2 flex items-center gap-2 text-[11px] text-muted flex-shrink-0">
        <Info className="w-3 h-3 text-sage-dark flex-shrink-0" strokeWidth={2} />
        <span className="font-medium">Diskusikan detail pickup, jadwal, dan kesepakatan harga</span>
      </div>

      {/* Chat panel - fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          threadId={thread.id}
          currentUserId={userId}
          height="h-full"
          fullscreen
        />
      </div>
    </div>
  )
}