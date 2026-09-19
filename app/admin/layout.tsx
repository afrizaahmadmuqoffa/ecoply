import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import {
  PROFILE_COOKIE,
  parseProfileCookie,
} from '@/lib/auth/profile-cookie'
import AdminSidebar from './_components/AdminSidebar'
import AppShell from '@/components/layout/AppShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const profile = parseProfileCookie(cookieStore.get(PROFILE_COOKIE)?.value)

  if (!profile || profile.role !== 'admin') redirect('/login')

  return (
    <AppShell
      sidebar={<AdminSidebar userName={profile.full_name ?? profile.email ?? ''} />}
      userName={profile.full_name ?? profile.email ?? ''}
    >
      {children}
    </AppShell>
  )
}