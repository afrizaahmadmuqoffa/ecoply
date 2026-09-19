'use client'

import { createContext, useContext, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { CARBON_UNIT_DEFAULT, type CarbonUnit } from '@/lib/carbon-units'

const STORAGE_KEY = 'ecoply.carbon-unit'

function readStorage(): CarbonUnit {
  if (typeof window === 'undefined') return CARBON_UNIT_DEFAULT
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'tco2e' || saved === 'kgco2e') return saved
  } catch {
    // storage tidak tersedia — abaikan
  }
  return CARBON_UNIT_DEFAULT
}

function emit() {
  for (const listener of store.listeners) listener()
}

const store = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    store.listeners.add(listener)
    window.addEventListener('storage', emit)
    return () => {
      store.listeners.delete(listener)
      window.removeEventListener('storage', emit)
    }
  },
}

type ContextValue = {
  unit: CarbonUnit
  setUnit: (unit: CarbonUnit) => void
}

const CarbonUnitContext = createContext<ContextValue>({
  unit: CARBON_UNIT_DEFAULT,
  setUnit: () => {},
})

export function CarbonUnitProvider({ children }: { children: ReactNode }) {
  const unit = useSyncExternalStore(store.subscribe, readStorage, () =>
    CARBON_UNIT_DEFAULT,
  )

  function setUnit(next: CarbonUnit) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage tidak tersedia — abaikan
    }
    emit()
  }

  return (
    <CarbonUnitContext.Provider value={{ unit, setUnit }}>
      {children}
    </CarbonUnitContext.Provider>
  )
}

export function useCarbonUnit() {
  return useContext(CarbonUnitContext)
}