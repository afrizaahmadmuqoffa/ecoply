'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Scope1StationaryForm from './Scope1StationaryForm'
import Scope1MobileForm from './Scope1MobileForm'
import Scope1FugitiveForm from './Scope1FugitiveForm'
import Scope2EnergyForm from './Scope2EnergyForm'
import Scope3C1Form from './Scope3C1Form'
import Scope3C2Form from './Scope3C2Form'

type CombustionFactor = { id: string; scope_category: string; fuel_name: string; unit: string; ef_scope1_co2e: number; is_fossil: boolean }
type VehicleFactor = { id: string; vehicle_type: string; unit: string; ef_co2e: number }
type Refrigerant = { id: string; refrigerant_name: string; gwp_value: number; gas_type: string }
type FugitiveAsset = { id: string; category_name: string; annual_leakage_rate: number; typical_refrigerant: string | null }
type GridFactor = { id: string; region_name: string; energy_type: string; unit: string; ef_kg_co2e: number; method: string | null }
type S3C1AvgFactor = { id: string; material_name: string; unit: string; ef_kg_co2e: number }
type S3C1SpendFactor = { id: string; sector_name: string; currency: string; ef_kg_co2e: number }
type S3C2AvgFactor = { id: string; material_name: string; unit: string; ef_kg_co2e: number }
type S3C2SpendFactor = { id: string; sector_name: string; currency: string; ef_kg_co2e: number }

export type CarbonFactorsProps = {
  combustionFactors: CombustionFactor[]
  vehicleFactors: VehicleFactor[]
  refrigerants: Refrigerant[]
  fugitiveAssets: FugitiveAsset[]
  gridFactors: GridFactor[]
  s3c1AvgFactors: S3C1AvgFactor[]
  s3c1SpendFactors: S3C1SpendFactor[]
  s3c2AvgFactors: S3C2AvgFactor[]
  s3c2SpendFactors: S3C2SpendFactor[]
}

const GROUPS = [
  {
    id: 's1',
    badgeText: 'S1',
    label: 'Scope 1',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    items: [
      { id: 's1_stationary', label: 'Stationary', hint: 'Genset, boiler' },
      { id: 's1_mobile', label: 'Mobile', hint: 'Kendaraan BBM/Jarak' },
      { id: 's1_fugitive', label: 'Fugitive', hint: 'AC/chiller' },
    ] as const,
  },
  {
    id: 's2',
    badgeText: 'S2',
    label: 'Scope 2',
    badge: 'bg-sky-50 text-sky-800 border-sky-200',
    items: [
      { id: 's2_energy', label: 'Energi', hint: 'Listrik & steam' },
    ] as const,
  },
  {
    id: 's3',
    badgeText: 'S3',
    label: 'Scope 3',
    badge: 'bg-purple-50 text-purple-800 border-purple-200',
    items: [
      { id: 's3_cat1', label: 'Cat 1', hint: 'Barang/Jasa' },
      { id: 's3_cat2', label: 'Cat 2', hint: 'Aset Kapital' },
    ] as const,
  },
] as const

type GroupId = typeof GROUPS[number]['id']
type TabItem = typeof GROUPS[number]['items'][number]
type TabId = TabItem['id']

export default function CarbonInputTabs(props: CarbonFactorsProps) {
  const [active, setActive] = useState<TabId>('s1_stationary')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<GroupId, boolean>>({
    s1: false,
    s2: false,
    s3: false,
  })

  const stationary = props.combustionFactors.filter((f) => f.scope_category === 'stationary')
  const mobileFuel = props.combustionFactors.filter((f) => f.scope_category === 'mobile')

  function renderTab(tabId: TabId) {
    switch (tabId) {
      case 's1_stationary':
        return <Scope1StationaryForm factors={stationary} />
      case 's1_mobile':
        return <Scope1MobileForm mobileFuels={mobileFuel} vehicleFactors={props.vehicleFactors} />
      case 's1_fugitive':
        return <Scope1FugitiveForm refrigerants={props.refrigerants} assetCategories={props.fugitiveAssets} />
      case 's2_energy':
        return <Scope2EnergyForm gridFactors={props.gridFactors} />
      case 's3_cat1':
        return <Scope3C1Form avgFactors={props.s3c1AvgFactors} spendFactors={props.s3c1SpendFactors} />
      case 's3_cat2':
        return <Scope3C2Form avgFactors={props.s3c2AvgFactors} spendFactors={props.s3c2SpendFactors} />
    }
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      {/* Mobile: dropdown select */}
      <div className="lg:hidden">
        <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
          Pilih Kategori
        </label>
        <select
          value={active}
          onChange={(e) => setActive(e.target.value as TabId)}
          className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
        >
          {GROUPS.map((g) => (
            <optgroup key={g.id} label={`${g.badgeText} — ${g.label}`}>
              {g.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Sidebar */}
      <aside className="hidden lg:block w-52 shrink-0">
        <nav className="bg-surface border border-border rounded-[18px] p-3 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <p className="px-2 pt-1 pb-2 text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
            Kategori
          </p>
          <div className="space-y-1">
            {GROUPS.map((g) => {
              const isCollapsed = collapsedGroups[g.id]
              return (
                <div key={g.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedGroups((prev) => ({ ...prev, [g.id]: !prev[g.id] }))
                    }
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-canvas transition-colors"
                  >
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${g.badge}`}>
                      {g.badgeText}
                    </span>
                    <span className="flex-1 text-left text-xs font-bold text-ink tracking-tight">
                      {g.label}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                        isCollapsed ? '' : 'rotate-180'
                      }`}
                      strokeWidth={2.5}
                    />
                  </button>

                  {!isCollapsed && (
                    <div className="mt-0.5 mb-1 ml-2 pl-3 border-l border-border space-y-0.5">
                      {g.items.map((item) => {
                        const isActive = active === item.id
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActive(item.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                              isActive
                                ? 'bg-mint text-sage-dark font-bold shadow-[0_2px_6px_-2px_rgba(85,158,123,0.3)]'
                                : 'text-muted hover:bg-canvas hover:text-ink font-medium'
                            }`}
                          >
                            <span className="block truncate">{item.label}</span>
                            <span
                              className={`block text-[10px] mt-0.5 ${
                                isActive ? 'text-sage-dark/70' : 'text-muted/70'
                              }`}
                            >
                              {item.hint}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1">{renderTab(active)}</main>
    </div>
  )
}