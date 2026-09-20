'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getRecyclerIncomingRequests } from '@/lib/supabase/actions/marketplace'
import RequestListSection, { type IncomingRequest } from './_components/RequestListSection'
import { AlertTriangle, ChevronLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeletons'

export default function RecyclerRequestsPage() {
  const [requests, setRequests] = useState<IncomingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRequests = async () => {
    const result = await getRecyclerIncomingRequests()
    setRequests((result.data as IncomingRequest[]) || [])
    if (result.error) setError(result.error as string)
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      setError(null)
      await loadRequests()
      setLoading(false)
    }
    init()
  }, [])

  return (
    <div>
      {loading ? (
        <div className="animate-fade-in">
          <Skeleton className="h-3.5 w-24 mb-5 rounded-full" />
          <div className="mb-6">
            <Skeleton className="h-9 sm:h-10 w-2/3 max-w-sm" />
            <Skeleton className="h-4 w-full max-w-xl mt-3" />
          </div>
        </div>
      ) : (
        <>
          <Link
            href="/recycler/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-sage-dark transition-colors mb-5"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
            Marketplace
          </Link>

          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
              Permintaan <span className="text-sage">Pickup.</span>
            </h1>
            <p className="mt-3 text-sm text-muted max-w-2xl">
              Daftar permintaan pengangkutan limbah dari perusahaan. Terima untuk mulai negosiasi & berdiskusi via chat.
            </p>
          </div>
        </>
      )}

      {loading ? (
        <div className="space-y-4 animate-fade-in">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-[18px] p-6">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Skeleton className="h-8 w-28 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              </div>
            </div>
          ))}
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
      ) : (
        <RequestListSection requests={requests} onRefresh={loadRequests} />
      )}
    </div>
  )
}