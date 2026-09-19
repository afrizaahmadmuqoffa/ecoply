import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import {
  PROFILE_COOKIE,
  parseProfileCookie,
} from '@/lib/auth/profile-cookie'
import RecyclerSidebar from './_components/RecyclerSidebar'
import AppShell from '@/components/layout/AppShell'

export default async function RecyclerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const profile = parseProfileCookie(cookieStore.get(PROFILE_COOKIE)?.value)

  if (!profile || profile.role !== 'recycler') redirect('/login')

  // Lapisan pertahanan kedua gate verifikasi (lapisan pertama: proxy.ts).
  // Cookie profil di-refresh middleware tiap request; halaman yang boleh
  // diakses user non-verified ditandai cookie vg-ok.
  if (profile.verification_status && profile.verification_status !== 'verified') {
    if (cookieStore.get('vg-ok')?.value !== '1') redirect('/verify/blocked')
  }

  return (
    <AppShell
      sidebar={
        <RecyclerSidebar
          userName={profile.full_name ?? profile.email ?? ''}
          verificationStatus={profile.verification_status ?? 'pending'}
        />
      }
      userName={profile.full_name ?? profile.email ?? ''}
    >
      {children}
    </AppShell>
  )
}