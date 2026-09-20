'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/supabase/actions/auth'
import Logo from '@/components/Logo'
import type { VerificationStatus } from '@/types/roles'
import { ClipboardCheck, CheckCircle2, ChevronRight, Clock, CloudFog, Info, LayoutDashboard, LogOut, Recycle } from 'lucide-react'

const navItems = [
  {
    href: '/company/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.8} />,
  },
  {
    href: '/company/compliance',
    label: 'Compliance AI',
    icon: <ClipboardCheck className="w-4 h-4" strokeWidth={1.8} />,
  },
  {
    href: '/company/carbon',
    label: 'Carbon Accounting',
    icon: <CloudFog className="w-4 h-4" strokeWidth={1.8} />,
  },
  {
    href: '/company/marketplace',
    label: 'Marketplace',
    icon: <Recycle className="w-4 h-4" strokeWidth={1.8} />,
  },
]

const profileHref = '/company/profile'

type Props = {
  userName: string
  verificationStatus: VerificationStatus
  onNavigate?: () => void
}

const statusLabel: Record<VerificationStatus, { text: string; classes: string; iconBg: string; icon: React.ReactNode }> = {
  pending: {
    text: 'Menunggu verifikasi',
    classes: 'text-amber-700 bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    icon: <Clock className="w-3 h-3" strokeWidth={2.5} />,
  },
  verified: {
    text: 'Terverifikasi',
    classes: 'text-sage-dark bg-mint border-sage/30',
    iconBg: 'bg-sage/20 text-sage-dark',
    icon: <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />,
  },
  rejected: {
    text: 'Ditolak',
    classes: 'text-red-700 bg-red-50 border-red-200',
    iconBg: 'bg-red-100 text-red-700',
    icon: <Info className="w-3 h-3" strokeWidth={2.5} />,
  },
}

export default function CompanySidebar({ userName, verificationStatus, onNavigate }: Props) {
  const pathname = usePathname()
  const status = statusLabel[verificationStatus]

  return (
    <aside className="w-64 flex flex-col bg-surface border-r border-border h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border">
        <Logo height={46} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 px-3 overflow-y-auto">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted px-3 mb-2">
          Navigation
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    active
                      ? 'bg-mint text-sage-dark font-semibold'
                      : 'text-muted hover:bg-canvas hover:text-ink'
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sage rounded-r-full"
                    />
                  )}
                  <span className={`flex-shrink-0 ${active ? 'text-sage-dark' : 'text-muted group-hover:text-ink'}`}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-border">
        <Link
          href={profileHref}
          onClick={onNavigate}
          className="group flex items-center gap-2.5 px-4 py-3.5 hover:bg-canvas transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-sage text-white flex items-center justify-center font-bold text-xs flex-shrink-0 ring-2 ring-mint">
            {(userName.trim().charAt(0) || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{userName}</p>
            <p className="text-[11px] text-muted flex items-center gap-1 group-hover:text-sage-dark transition-colors">
              Edit Profil
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${status.classes}`}>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${status.iconBg}`}>
              {status.icon}
            </span>
            {status.text}
          </span>
        </Link>

        <div className="px-4 py-3 border-t border-border">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted hover:border-red-700 hover:text-red-700 hover:bg-canvas transition-all"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
              Keluar
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}