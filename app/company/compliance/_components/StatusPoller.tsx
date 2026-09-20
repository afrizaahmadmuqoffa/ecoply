'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 5000
const PROCESSING = new Set(['queued', 'processing'])

export default function StatusPoller({ status }: { status: string }) {
  const router = useRouter()
  const active = PROCESSING.has(status)

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [active, router])

  return null
}