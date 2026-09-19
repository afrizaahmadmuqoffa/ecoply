'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import StationaryCombustionTab from './tabs/StationaryCombustionTab'
import MobileTab from './tabs/MobileTab'
import FugitiveTab from './tabs/FugitiveTab'
import GridTab from './tabs/GridTab'
import S3C1Tab from './tabs/S3C1Tab'
import S3C2Tab from './tabs/S3C2Tab'
import RecyclingTab from './tabs/RecyclingTab'

const GROUPS = [
  {
    id: 's1',
    badgeText: 'S1',
    label: 'Scope 1',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    items: [
      { id: 'stationary', label: 'Stationary Combustion', hint: 'Genset, boiler, furnace' },
      { id: 'mobile', label: 'Mobile Combustion', hint: 'Kendaraan operasional' },
      { id: 'fugitive', label: 'Fugitive', hint: 'Refrigeran & aset' },
    ] as const,
  },
  {
    id: 's2',
    badgeText: 'S2',
    label: 'Scope 2',
    badge: 'bg-sky-50 text-sky-800 border-sky-200',
    items: [
      { id: 'grid', label: 'Grid / Energy', hint: 'Listrik & energi beli' },
    ] as const,
  },
  {
    id: 's3',
    badgeText: 'S3',
    label: 'Scope 3',
    badge: 'bg-purple-50 text-purple-800 border-purple-200',
    items: [
      { id: 's3c1', label: 'Scope 3 Cat 1', hint: 'Barang & jasa beli' },
      { id: 's3c2', label: 'Scope 3 Cat 2', hint: 'Barang modal' },
    ] as const,
  },
  {
    id: 'av',
    badgeText: 'AV',
    label: 'Daur Ulang',
    badge: 'bg-mint text-sage-dark border-sage/30',
    items: [
      { id: 'recycling', label: 'Daur Ulang', hint: 'Avoided emissions' },
    ] as const,
  },
] as const

type GroupId = typeof GROUPS[number]['id']
type TabItem = typeof GROUPS[number]['items'][number]
type TabId = TabItem['id']

type CombustionRow = Parameters<typeof StationaryCombustionTab>[0]['rows'][number]
type VehicleRow = Parameters<typeof MobileTab>[0]['vehicles'][number]
type RefrigerantRow = Parameters<typeof FugitiveTab>[0]['refrigerants'][number]
type FugitiveAssetRow = Parameters<typeof FugitiveTab>[0]['fugitiveAssets'][number]
type S3C1AvgRow = Parameters<typeof S3C1Tab>[0]['avgFactors'][number]
type S3C1SpendRow = Parameters<typeof S3C1Tab>[0]['spendFactors'][number]
type S3C2AvgRow = Parameters<typeof S3C2Tab>[0]['avgFactors'][number]
type S3C2SpendRow = Parameters<typeof S3C2Tab>[0]['spendFactors'][number]
type RecyclingRow = Parameters<typeof RecyclingTab>[0]['rows'][number]

type Props = {
  combustion: CombustionRow[]
  vehicles: VehicleRow[]
  refrigerants: RefrigerantRow[]
  fugitiveAssets: FugitiveAssetRow[]
  grids: Parameters<typeof GridTab>[0]['rows']
  s3c1Avg: S3C1AvgRow[]
  s3c1Spend: S3C1SpendRow[]
  s3c2Avg: S3C2AvgRow[]
  s3c2Spend: S3C2SpendRow[]
  recycling: RecyclingRow[]
}

export default function CarbonConfigTabs(props: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('stationary')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<GroupId, boolean>>({
    s1: false,
    s2: false,
    s3: false,
    av: false,
  })

  const stationary = props.combustion.filter(c => c.scope_category === 'stationary')
  const mobileFuel = props.combustion.filter(c => c.scope_category === 'mobile')

  const activeItem: TabItem | undefined = GROUPS
    .map((g) => g.items)
    .reduce<TabItem[]>((acc, items) => acc.concat([...items]), [])
    .find((i) => i.id === activeTab)

  function renderTab(tabId: TabId) {
    switch (tabId) {
      case 'stationary': return <StationaryCombustionTab rows={stationary} />
      case 'mobile': return <MobileTab mobileFuels={mobileFuel} vehicles={props.vehicles} />
      case 'fugitive': return <FugitiveTab refrigerants={props.refrigerants} fugitiveAssets={props.fugitiveAssets} />
      case 'grid': return <GridTab rows={props.grids} />
      case 's3c1': return <S3C1Tab avgFactors={props.s3c1Avg} spendFactors={props.s3c1Spend} />
      case 's3c2': return <S3C2Tab avgFactors={props.s3c2Avg} spendFactors={props.s3c2Spend} />
      case 'recycling': return <RecyclingTab rows={props.recycling} />
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Mobile: dropdown select */}
      <div className="lg:hidden">
        <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
          Pilih Kategori
        </label>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabId)}
          className="w-full px-3 py-2 bg-canvas border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
        >
          {GROUPS.map((g) => (
            <optgroup key={g.id} label={`${g.badgeText} — ${g.label}`}>
              {g.items.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-6">
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
                        const isActive = activeTab === item.id
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                              isActive
                                ? 'bg-mint text-sage-dark font-bold shadow-[0_2px_6px_-2px_rgba(85,158,123,0.3)]'
                                : 'text-muted hover:bg-canvas hover:text-ink font-medium'
                            }`}
                          >
                            {item.label}
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
      <main className="flex-1 min-w-0">
        {renderTab(activeTab)}
      </main>
    </div>
  )
}