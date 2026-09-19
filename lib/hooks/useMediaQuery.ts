'use client'

import { useSyncExternalStore } from 'react'

const mqls = new Map<string, MediaQueryList>()

function getMql(query: string): MediaQueryList | null {
  if (typeof window === 'undefined') return null
  let mql = mqls.get(query)
  if (!mql) {
    mql = window.matchMedia(query)
    mqls.set(query, mql)
  }
  return mql
}

function subscribe(query: string, onStoreChange: () => void) {
  const mql = getMql(query)
  if (!mql) return () => {}
  mql.addEventListener('change', onStoreChange)
  return () => mql.removeEventListener('change', onStoreChange)
}

export default function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onStoreChange) => subscribe(query, onStoreChange),
    () => getMql(query)?.matches ?? false,
    () => false,
  )
}