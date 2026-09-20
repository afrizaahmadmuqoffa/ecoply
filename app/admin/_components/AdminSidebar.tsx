'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/supabase/actions/auth'
import Logo from '@/components/Logo'
import { BadgeCheck, ClipboardList, FileText, LayoutDashboard, LogOut, Settings } from 'lucide-react'

const navItems = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.8} />,
  },
  {
    href: '/admin/verification',
    label: 'Verifikasi Entitas',
    icon: <BadgeCheck className="w-4 h-4" strokeWidth={1.8} />,
  },
  {
    href: '/admin/regulations',
    label: 'Dokumen Regulasi',
    icon: <FileText className="w-4 h-4" strokeWidth={1.8} />,
  },
  {
    href: '/admin/carbon-config',
    label: 'Konfigurasi Karbon',
    icon: <Settings className="w-4 h-4" strokeWidth={1.8} />,
  },
  {
    href: '/admin/ops',
    label: 'Log Operasional',
    icon: <ClipboardList className="w-4 h-4" strokeWidth={1.8} />,
  },
]

type Props = {
  userName: string
  onNavigate?: () => void
}

export default function AdminSidebar({ userName, onNavigate }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex flex-col bg-surface border-r border-border h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Logo height={46} />
        </div>
        <span className="text-[8px] font-bold tracking-[0.14em] uppercase text-sage-dark bg-mint px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">
          Admin
        </span>
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
      <div className="border-t border-border p-4 space-y-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center font-bold text-xs flex-shrink-0 ring-2 ring-canvas">
            {(userName.trim().charAt(0) || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{userName}</p>
            <p className="text-[10px] text-muted truncate">Administrator</p>
          </div>
        </div>
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
    </aside>
  )
}