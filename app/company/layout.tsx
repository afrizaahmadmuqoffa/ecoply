import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import {
  PROFILE_COOKIE,
  parseProfileCookie,
} from '@/lib/auth/profile-cookie'
import CompanySidebar from './_components/CompanySidebar'
import AppShell from '@/components/layout/AppShell'

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const profile = parseProfileCookie(cookieStore.get(PROFILE_COOKIE)?.value)

  if (!profile || profile.role !== 'company') redirect('/login')

  // Lapisan pertahanan kedua gate verifikasi (lapisan pertama: proxy.ts).
  // Cookie profil di-refresh middleware tiap request; halaman yang boleh
  // diakses user non-verified ditandai cookie vg-ok.
  if (profile.verification_status && profile.verification_status !== 'verified') {
    if (cookieStore.get('vg-ok')?.value !== '1') redirect('/verify/blocked')
  }

  return (
    <AppShell
      sidebar={
        <CompanySidebar
          userName={profile.full_name ?? profile.email ?? ''}
          verificationStatus={profile.verification_status ?? 'pending'}
        />
      }
      userName={profile.full_name ?? profile.email ?? ''}
      avatarColor="sage"
    >
      {children}
    </AppShell>
  )
}