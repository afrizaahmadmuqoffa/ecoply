import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CompanyOnboardingForm from '@/app/onboarding/_components/CompanyOnboardingForm'
import OnboardingSteps from '@/app/onboarding/_components/OnboardingSteps'
import Logo from '@/components/Logo'

export default async function CompanyProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Sudah punya profil → dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile) redirect('/company/dashboard')

  // Belum pilih role / role salah → kembali ke pilih role
  const role = user.user_metadata?.role as string | undefined
  if (role !== 'company') redirect('/onboarding/role')

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Brand mark */}
        <div className="flex justify-center mb-8">
          <Logo height={70} />
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <OnboardingSteps current={3} />
        </div>

        <CompanyOnboardingForm />
      </div>
    </div>
  )
}